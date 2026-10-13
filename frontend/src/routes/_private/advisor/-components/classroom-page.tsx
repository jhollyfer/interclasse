import * as React from 'react'
import { getRouteApi } from '@tanstack/react-router'
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
import {
  PageHeader,
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
import type { IStudent } from '#/lib/interfaces'

import { studentsOf } from '../$classroomId/index'

const route = getRouteApi('/_private/advisor/$classroomId/')

/**
 * A turma do conselheiro: a lista de alunos e quem joga o quê.
 *
 * Duas abas e não duas rotas: as duas leem a mesma turma, e quem cadastra um
 * aluno quase sempre vai inscrevê-lo logo em seguida.
 */
export function ClassroomPage(): React.JSX.Element {
  const { classroomId } = route.useParams()
  const { data: board } = useSuspenseQuery(
    advisorEnrollmentsQueryOptions(classroomId),
  )
  const queryClient = useQueryClient()

  const save = useAdvisorEnrollmentUpdate({
    onSuccess: (updated) => {
      queryClient.setQueryData(
        queryKeys.enrollments.board(classroomId),
        updated,
      )
      toast.success('Atletas salvos.')
    },
    onError: (error) => toast.error(error.message, { id: 'enrollment-save' }),
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderBack to="/advisor" />
        <PageHeaderTitle>{board.classroom.name}</PageHeaderTitle>
        <PageHeaderDescription>
          {CATEGORY_LABELS[board.classroom.category]}
        </PageHeaderDescription>
      </PageHeader>

      <Tabs defaultValue="athletes">
        <TabsList>
          <TabsTrigger value="athletes">Atletas por modalidade</TabsTrigger>
          <TabsTrigger value="students">Alunos</TabsTrigger>
        </TabsList>
        <TabsContent value="athletes" className="pt-4">
          <EnrollmentBoard
            board={board}
            savingSportId={
              (save.isPending && save.variables.sportId) || undefined
            }
            onSave={(sportId, studentIds) =>
              save.mutate({ classroomId, sportId, studentIds })
            }
          />
        </TabsContent>
        <TabsContent value="students" className="pt-4">
          <Students classroomId={classroomId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** O cadastro de alunos: um campo para adicionar, e editar e tirar por linha. */
function Students({ classroomId }: { classroomId: string }): React.JSX.Element {
  const { data } = useSuspenseQuery(
    studentsQueryOptions(studentsOf(classroomId)),
  )
  const queryClient = useQueryClient()
  const [name, setName] = React.useState('')

  // Aluno novo ou removido muda a matriz de inscrições também.
  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all }),
    ])
  }

  const create = useStudentCreate({
    onSuccess: async () => {
      setName('')
      await invalidate()
    },
    onError: (error) => toast.error(error.message, { id: 'student-create' }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.meta.total} alunos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          method="post"
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (name.trim()) create.mutate({ classroomId, name: name.trim() })
          }}
        >
          <Input
            aria-label="Nome do aluno"
            placeholder="Nome do aluno"
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button type="submit" disabled={create.isPending || !name.trim()}>
            <PlusIcon />
            Adicionar
          </Button>
        </form>

        <ul className="divide-y">
          {data.data.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              onChange={invalidate}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function StudentRow({
  student,
  onChange,
}: {
  student: IStudent
  onChange: () => Promise<void>
}): React.JSX.Element {
  const [editing, setEditing] = React.useState(false)
  const [name, setName] = React.useState(student.name)

  const update = useStudentUpdate({
    onSuccess: async () => {
      setEditing(false)
      await onChange()
    },
    onError: (error) => toast.error(error.message, { id: 'student-update' }),
  })
  const remove = useStudentDelete({
    onSuccess: onChange,
    // Aluno inscrito numa modalidade já sorteada: `409 STUDENT_IN_COMPETITION`.
    onError: (error) => toast.error(error.message, { id: 'student-delete' }),
  })

  if (editing) {
    return (
      <li className="py-2">
        <form
          method="post"
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            update.mutate({ id: student.id, name: name.trim() })
          }}
        >
          <Input
            aria-label="Nome do aluno"
            autoFocus
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            disabled={update.isPending || !name.trim()}
          >
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
