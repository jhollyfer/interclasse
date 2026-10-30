import type * as React from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { AdministratorClassroomCreateValidator } from '@interclasse/shared'
import type {
  AdministratorClassroomUpdatePayload,
  AdministratorClassroomShowResponse,
  Merge,
} from '@interclasse/shared'

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
import { classroomQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { useClassroomUpdate } from '#/integrations/tanstack-query/mutations/administrator'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'
import { m } from '#/paraglide/messages'

import type { ClassroomFormType } from './form-fields'
import { CLASSROOM_FIELDS, ClassroomFormFields } from './form-fields'

const route = getRouteApi('/_private/administrator/classrooms/$id/edit')

/** Valida com o schema de criação: nome e ano não podem ser apagados. */
export function ClassroomFormEdit(): React.JSX.Element {
  const { id } = route.useParams()
  const { data: classroom } = useSuspenseQuery(classroomQueryOptions(id))

  const { form, onSubmit, shell } = useResourceForm<
    ClassroomFormType,
    AdministratorClassroomShowResponse,
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
    invalidate: queryKeys.administrator.classrooms.all,
    alsoInvalidate: DEPENDENTS.classrooms,
    backTo: '/administrator/classrooms',
    success: (updated) => m.admin_classrooms_saved({ name: updated.name }),
    retry: 'classroom-update-error',
    payload: (values) => ({ ...values, id }),
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>
          {m.admin_common_edit_named({ name: classroom.name })}
        </FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={onSubmit}>
        <Card>
          <CardContent>
            <ClassroomFormFields form={form} idPrefix="edit-classroom" />
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
