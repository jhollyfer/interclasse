import * as React from 'react'
import type { LinkProps } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import {
  ConfirmDialog,
  ConfirmDialogDescription,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { EnrollmentBoard } from '#/components/common/enrollment-board'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import type { StudentUpdateVariables } from '#/integrations/tanstack-query/mutations'
import {
  StudentCreateValidator,
  StudentUpdateValidator,
} from '#/validators/advisor/students.validator'
import type {
  StudentCreatePayload,
  StudentUpdatePayload,
} from '#/validators/advisor/students.validator'
import { notifyError } from '#/lib/form-errors'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderBack,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import {
  useAdvisorEnrollmentUpdate,
  useStudentCreate,
  useStudentDelete,
  useStudentUpdate,
} from '#/integrations/tanstack-query/mutations'
import {
  advisorEnrollmentsQueryOptions,
  studentsQueryOptions,
} from '#/integrations/tanstack-query/queries'
import { CATEGORY_LABELS } from '#/lib/labels'
import type { IEnrollmentBoard, IStudent } from '#/lib/interfaces'

import { ClassroomCards } from './classroom-cards'
import { studentsOf } from './classroom-detail-loader'
import { ClassroomMatches } from './classroom-matches'
import { ClassroomSummary } from './classroom-summary'
import { RemovalReasonDialog } from './removal-reason-dialog'
import type { PendingRemoval } from './removal-reason-dialog'

type ClassroomDetailProps = Readonly<{
  classroomId: string
  /** Para onde o "voltar" leva. Ausente no conselheiro, que só tem esta turma. */
  back?: LinkProps['to']
  /** Ações do cabeçalho - o "Editar turma" do administrador. */
  actions?: React.ReactNode
}>

/**
 * A turma inteira numa tela: quem aconselha e representa, os totais, quem
 * joga o quê, os alunos, os cartões e os jogos.
 *
 * A mesma tela no painel do administrador e no do conselheiro: os dois leem a
 * mesma turma, e o servidor recorta o que cada um pode ver.
 *
 * Abas e não rotas: todas leem a mesma turma, e quem cadastra um aluno quase
 * sempre vai inscrevê-lo logo em seguida.
 */
export function ClassroomDetail({
  classroomId,
  back,
  actions,
}: ClassroomDetailProps): React.JSX.Element {
  const { data: board } = useSuspenseQuery(
    advisorEnrollmentsQueryOptions(classroomId),
  )
  const queryClient = useQueryClient()
  const [pending, setPending] = React.useState<PendingRemoval | null>(null)

  const store = (updated: IEnrollmentBoard) =>
    queryClient.setQueryData(
      queryKeys.advisor.enrollments.board(classroomId),
      updated,
    )

  const save = useAdvisorEnrollmentUpdate({
    onSuccess: (updated) => {
      store(updated)
      toast.success('Atletas salvos.')
    },
    onError: (error) => notifyError(error, { id: 'enrollment-save' }),
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        {back && <PageHeaderBack to={back} />}
        <PageHeaderTitle>{board.classroom.name}</PageHeaderTitle>
        <PageHeaderDescription>
          {CATEGORY_LABELS[board.classroom.category]}
        </PageHeaderDescription>
        {actions && <PageHeaderActions>{actions}</PageHeaderActions>}
      </PageHeader>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_18rem]">
        <ClassroomSummary board={board} className="lg:order-last" />
        <Tabs defaultValue="athletes" className="min-w-0">
          <TabsList>
            <TabsTrigger value="athletes">Atletas por modalidade</TabsTrigger>
            <TabsTrigger value="students">Alunos</TabsTrigger>
            <TabsTrigger value="cards">Cartões</TabsTrigger>
            <TabsTrigger value="matches">Jogos</TabsTrigger>
          </TabsList>
          <TabsContent value="athletes" className="pt-4">
            <EnrollmentBoard
              board={board}
              savingSportId={
                (save.isPending && save.variables.sportId) || undefined
              }
              onSave={(sportId, studentIds, removed) => {
                // Tirar atleta pede o motivo antes de gravar.
                if (removed.length > 0) {
                  const sportName =
                    board.sports.find((sport) => sport.id === sportId)?.name ??
                    ''
                  setPending({ sportId, sportName, studentIds, removed })
                  return
                }
                save.mutate({ classroomId, sportId, studentIds })
              }}
            />
            {pending && (
              <RemovalReasonDialog
                key={pending.sportId}
                classroomId={classroomId}
                pending={pending}
                onClose={() => setPending(null)}
                onSaved={store}
              />
            )}
          </TabsContent>
          <TabsContent value="students" className="pt-4">
            <Students classroomId={classroomId} />
          </TabsContent>
          <TabsContent value="cards" className="pt-4">
            <ClassroomCards classroomId={classroomId} />
          </TabsContent>
          <TabsContent value="matches" className="pt-4">
            <ClassroomMatches classroomId={classroomId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

/** Aluno novo, renomeado ou removido muda a matriz de inscrições também. */
const STUDENT_CHANGE = [
  queryKeys.advisor.students.all,
  queryKeys.advisor.enrollments.all,
]

const STUDENT_FIELDS = ['name'] as const

/** O rótulo do campo de nome: só para leitor de tela, a linha já diz o que é. */
const NAME_LABEL = <span className="sr-only">Nome do aluno</span>

/** O cadastro de alunos: um campo para adicionar, e editar e tirar por linha. */
function Students({
  classroomId,
}: Readonly<{ classroomId: string }>): React.JSX.Element {
  const { data } = useSuspenseQuery(
    studentsQueryOptions(studentsOf(classroomId)),
  )
  const invalidate = useInvalidate()

  const { form, mutation, onSubmit } = useMutationForm<
    StudentCreatePayload,
    IStudent,
    StudentCreatePayload
  >({
    validator: StudentCreateValidator,
    defaults: { classroomId, name: '' },
    fields: STUDENT_FIELDS,
    mutation: useStudentCreate,
    invalidate: STUDENT_CHANGE,
    payload: (values) => values,
    onSuccess: (): void => form.reset({ classroomId, name: '' }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.meta.total} alunos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          method="post"
          className="flex items-start gap-2"
          onSubmit={onSubmit}
        >
          <AppField
            control={form.control}
            name="name"
            id="student-create-name"
            label={NAME_LABEL}
          >
            {({ field, control }) => (
              <Input
                {...field}
                {...control}
                placeholder="Nome do aluno"
                maxLength={120}
              />
            )}
          </AppField>
          <Button type="submit" disabled={mutation.isPending}>
            <PlusIcon />
            Adicionar
          </Button>
        </form>
        <AppFormRootError form={form} />

        <ul className="divide-y">
          {data.data.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              onChange={() => invalidate(STUDENT_CHANGE)}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

type StudentRowProps = Readonly<{
  student: IStudent
  onChange: () => Promise<void>
}>

function StudentRow({ student, onChange }: StudentRowProps): React.JSX.Element {
  const [editing, setEditing] = React.useState(false)

  const { form, mutation, onSubmit } = useMutationForm<
    StudentUpdatePayload,
    IStudent,
    StudentUpdateVariables
  >({
    validator: StudentUpdateValidator,
    values: { name: student.name },
    fields: STUDENT_FIELDS,
    mutation: useStudentUpdate,
    invalidate: STUDENT_CHANGE,
    // Renomear é escrita idempotente: reenviar grava o mesmo nome.
    retry: 'student-update',
    payload: (values) => ({ ...values, id: student.id }),
    onSuccess: () => setEditing(false),
  })
  const remove = useStudentDelete({
    onSuccess: onChange,
    // Aluno inscrito numa modalidade já sorteada: `409 STUDENT_IN_COMPETITION`.
    onError: (error) => notifyError(error, { id: 'student-delete' }),
  })

  if (editing) {
    return (
      <li className="py-2">
        <form
          method="post"
          className="flex items-start gap-2"
          onSubmit={onSubmit}
        >
          <AppField
            control={form.control}
            name="name"
            id={`student-${student.id}-name`}
            label={NAME_LABEL}
          >
            {({ field, control }) => (
              <Input {...field} {...control} autoFocus maxLength={120} />
            )}
          </AppField>
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            Salvar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </Button>
        </form>
        <AppFormRootError form={form} />
      </li>
    )
  }

  return (
    <li className="flex items-center gap-2 py-2">
      <span className="flex-1">{student.name}</span>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`Editar ${student.name}`}
        onClick={() => setEditing(true)}
      >
        <PencilSimpleIcon />
      </Button>
      <ConfirmDialog
        destructive
        onConfirm={() => remove.mutate(student.id)}
        trigger={
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Tirar ${student.name}`}
          >
            <TrashIcon />
          </Button>
        }
      >
        <ConfirmDialogHeader>
          <ConfirmDialogTitle>{`Tirar ${student.name} da turma?`}</ConfirmDialogTitle>
          <ConfirmDialogDescription>
            As inscrições dele saem junto.
          </ConfirmDialogDescription>
        </ConfirmDialogHeader>
        <ConfirmDialogFooter>
          <ConfirmDialogCancel />
          <ConfirmDialogConfirm>Remover</ConfirmDialogConfirm>
        </ConfirmDialogFooter>
      </ConfirmDialog>
    </li>
  )
}
