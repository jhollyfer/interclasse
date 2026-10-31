import {
  AdvisorStudentCreateValidator,
  AdvisorStudentUpdateValidator,
} from '@interclasse/shared'
import type {
  AdvisorStudentCreatePayload,
  AdvisorStudentUpdatePayload,
  AdvisorEnrollmentShowResponse,
  AdvisorStudentShowResponse,
} from '@interclasse/shared'
import { PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import type { LinkProps } from '@tanstack/react-router'
import * as React from 'react'
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
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import type { StudentUpdateVariables } from '#/integrations/tanstack-query/mutations/advisor'
import {
  useAdvisorEnrollmentUpdateMutation,
  useStudentCreateMutation,
  useStudentDeleteMutation,
  useStudentUpdateMutation,
} from '#/integrations/tanstack-query/mutations/advisor'
import {
  advisorEnrollmentsQueryOptions,
  studentsQueryOptions,
} from '#/integrations/tanstack-query/queries/advisor'
import { createDialogHandle } from '#/lib/dialog-handle'
import { notifyError } from '#/lib/form-errors'
import { CATEGORY_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { ClassroomCards } from './classroom-cards'
import { studentsOf } from './classroom-detail-loader'
import { ClassroomMatches } from './classroom-matches'
import { ClassroomSummary } from './classroom-summary'
import { RemovalReasonDialog } from './removal-reason-dialog'
import type { PendingRemoval } from './removal-reason-dialog'

type ClassroomDetailProps = Readonly<{
  classroomId: string
  /** Where "back" leads. Absent for the advisor, who only has this classroom. */
  back?: LinkProps['to']
  /** Header actions - the administrator's "Editar turma". */
  actions?: React.ReactNode
}>

/**
 * The whole classroom on one screen: who advises and represents, the totals, who
 * plays what, the students, the cards and the matches.
 *
 * The same screen on the administrator's and the advisor's dashboard: both read the
 * same classroom, and the server trims what each may see.
 *
 * Tabs and not routes: all read the same classroom, and whoever registers a student almost
 * always goes on to enroll them right after.
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
  const [removalHandle] = React.useState(() =>
    createDialogHandle<PendingRemoval>(),
  )

  const store = (updated: AdvisorEnrollmentShowResponse) =>
    queryClient.setQueryData(
      queryKeys.advisor.enrollments.board(classroomId),
      updated,
    )

  const save = useAdvisorEnrollmentUpdateMutation({
    onSuccess: (updated) => {
      store(updated)
      toast.success(m.common_classroom_saved())
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

      <div className="grid items-start gap-4 lg:grid-cols-main-aside">
        <ClassroomSummary board={board} className="lg:order-last" />
        <Tabs defaultValue="athletes" className="min-w-0">
          <TabsList>
            <TabsTrigger value="athletes">
              {m.common_classroom_tab_athletes()}
            </TabsTrigger>
            <TabsTrigger value="students">
              {m.common_classroom_tab_students()}
            </TabsTrigger>
            <TabsTrigger value="cards">
              {m.common_classroom_tab_cards()}
            </TabsTrigger>
            <TabsTrigger value="matches">
              {m.common_classroom_tab_matches()}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="athletes" className="pt-4">
            <EnrollmentBoard
              board={board}
              savingSportId={
                (save.isPending && save.variables.sportId) || undefined
              }
              onSave={(sportId, studentIds, removed) => {
                // Removing an athlete asks for the reason before saving.
                if (removed.length > 0) {
                  const sportName =
                    board.sports.find((sport) => sport.id === sportId)?.name ??
                    ''
                  removalHandle.openWithPayload({
                    sportId,
                    sportName,
                    studentIds,
                    removed,
                  })
                  return
                }
                save.mutate({ classroomId, sportId, studentIds })
              }}
            />
            <RemovalReasonDialog
              classroomId={classroomId}
              handle={removalHandle}
              onSaved={store}
            />
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

/** A new, renamed or removed student changes the enrollment matrix too. */
const STUDENT_CHANGE = [
  queryKeys.advisor.students.all,
  queryKeys.advisor.enrollments.all,
]

const STUDENT_FIELDS = ['name'] as const

/** The name field's label: for the screen reader only, the row already says what it is. */
const NAME_LABEL = <span className="sr-only">{m.common_student_name()}</span>

/** The student registry: one field to add, and edit and remove per row. */
function Students({
  classroomId,
}: Readonly<{ classroomId: string }>): React.JSX.Element {
  const { data } = useSuspenseQuery(
    studentsQueryOptions(studentsOf(classroomId)),
  )
  const invalidate = useInvalidate()

  const { form, mutation, onSubmit } = useMutationForm<
    AdvisorStudentCreatePayload,
    AdvisorStudentShowResponse,
    AdvisorStudentCreatePayload
  >({
    validator: AdvisorStudentCreateValidator,
    defaults: { classroomId, name: '' },
    fields: STUDENT_FIELDS,
    mutation: useStudentCreateMutation,
    invalidate: STUDENT_CHANGE,
    payload: (values) => values,
    onSuccess: (): void => form.reset({ classroomId, name: '' }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {m.common_students_count({ count: data.meta.total })}
        </CardTitle>
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
                placeholder={m.common_student_name()}
                maxLength={120}
              />
            )}
          </AppField>
          <Button type="submit" disabled={mutation.isPending}>
            <PlusIcon />
            {m.common_student_add()}
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
  student: AdvisorStudentShowResponse
  onChange: () => Promise<void>
}>

function StudentRow({ student, onChange }: StudentRowProps): React.JSX.Element {
  const [editing, setEditing] = React.useState(false)

  const { form, mutation, onSubmit } = useMutationForm<
    AdvisorStudentUpdatePayload,
    AdvisorStudentShowResponse,
    StudentUpdateVariables
  >({
    validator: AdvisorStudentUpdateValidator,
    values: { name: student.name },
    fields: STUDENT_FIELDS,
    mutation: useStudentUpdateMutation,
    invalidate: STUDENT_CHANGE,
    // Renaming is an idempotent write: resending saves the same name.
    retry: 'student-update',
    payload: (values) => ({ ...values, id: student.id }),
    onSuccess: () => setEditing(false),
  })
  const remove = useStudentDeleteMutation({
    onSuccess: onChange,
    // A student enrolled in an already drawn sport: `409 STUDENT_IN_COMPETITION`.
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
              // eslint-disable-next-line jsx-a11y/no-autofocus -- the field is born from a click on Editar: focus goes where the person just asked
              <Input {...field} {...control} autoFocus maxLength={120} />
            )}
          </AppField>
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {m.common_save()}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            {m.common_cancel()}
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
        aria-label={m.common_student_edit_aria({ name: student.name })}
        onClick={() => setEditing(true)}
      >
        <PencilSimpleIcon />
      </Button>
      <ConfirmDialog
        destructive
        onConfirm={() => remove.mutate(student.id)}
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={m.common_student_remove_aria({ name: student.name })}
          >
            <TrashIcon />
          </Button>
        }
      >
        <ConfirmDialogHeader>
          <ConfirmDialogTitle>
            {m.common_student_remove_title({ name: student.name })}
          </ConfirmDialogTitle>
          <ConfirmDialogDescription>
            {m.common_student_remove_description()}
          </ConfirmDialogDescription>
        </ConfirmDialogHeader>
        <ConfirmDialogFooter>
          <ConfirmDialogCancel />
          <ConfirmDialogConfirm>{m.common_remove()}</ConfirmDialogConfirm>
        </ConfirmDialogFooter>
      </ConfirmDialog>
    </li>
  )
}
