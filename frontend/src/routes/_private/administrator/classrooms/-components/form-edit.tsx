import type * as React from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import {
  FormShell,
  FormShellActions,
  FormShellBack,
  FormShellContent,
  FormShellDiscard,
  FormShellHeader,
  FormShellSubmit,
  FormShellTitle,
} from '#/components/common/form-shell'
import { Card, CardContent } from '#/components/ui/card'
import { CLASSROOM_FIELDS, ClassroomFormFields } from './form-fields'
import type { ClassroomFormType } from './form-fields'
import { AdministratorClassroomCreateValidator } from '#/validators/administrator/classrooms.validator'
import type { Classroom } from '#/lib/validator'
import type { AdministratorClassroomUpdatePayload } from '#/validators/administrator/classrooms.validator'
import type { Merge } from '#/lib/interfaces'
import { classroomQueryOptions } from '#/integrations/tanstack-query/queries'
import { useClassroomUpdate } from '#/integrations/tanstack-query/mutations'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'

const route = getRouteApi('/_private/administrator/classrooms/$id/edit')

/** Valida com o schema de criação: nome e ano não podem ser apagados. */
export function ClassroomFormEdit(): React.JSX.Element {
  const { id } = route.useParams()
  const { data: classroom } = useSuspenseQuery(classroomQueryOptions(id))

  const { form, onValid, shell } = useResourceForm<
    ClassroomFormType,
    Classroom,
    Merge<AdministratorClassroomUpdatePayload, { id: string }>
  >({
    formId: 'classroom-update',
    validator: AdministratorClassroomCreateValidator,
    values: {
      name: classroom.name,
      grade: classroom.grade,
      advisorId: classroom.advisorId,
      representativeId: classroom.representativeId,
    },
    fields: CLASSROOM_FIELDS,
    mutation: useClassroomUpdate,
    invalidate: queryKeys.classrooms.all,
    alsoInvalidate: DEPENDENTS.classrooms,
    backTo: '/administrator/classrooms',
    success: (updated) => `Turma ${updated.name} salva.`,
    retry: 'classroom-update-error',
    payload: (values) => ({ ...values, id }),
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>Editar {classroom.name}</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={form.handleSubmit(onValid)}>
        <Card>
          <CardContent>
            <ClassroomFormFields form={form} idPrefix="edit-classroom" />
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
