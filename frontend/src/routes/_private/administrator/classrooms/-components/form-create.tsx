import type * as React from 'react'
import { AdministratorClassroomCreateValidator } from '@interclasse/shared'
import type {
  AdministratorClassroomCreatePayload,
  AdministratorClassroomShowResponse,
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
import { useClassroomCreateMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'
import { m } from '#/paraglide/messages'

import type { ClassroomFormType } from './form-fields'
import {
  CLASSROOM_FIELDS,
  CLASSROOM_FORM_DEFAULTS,
  ClassroomFormFields,
} from './form-fields'

export function ClassroomFormCreate(): React.JSX.Element {
  const { form, onSubmit, shell } = useResourceForm<
    ClassroomFormType,
    AdministratorClassroomShowResponse,
    AdministratorClassroomCreatePayload
  >({
    formId: 'classroom-create',
    validator: AdministratorClassroomCreateValidator,
    defaults: CLASSROOM_FORM_DEFAULTS,
    fields: CLASSROOM_FIELDS,
    mutation: useClassroomCreateMutation,
    invalidate: queryKeys.administrator.classrooms.all,
    alsoInvalidate: DEPENDENTS.classrooms,
    backTo: '/administrator/classrooms',
    success: (classroom) =>
      m.admin_classrooms_created({ name: classroom.name }),
    // Nome repetido é `409 CLASSROOM_ALREADY_EXISTS`: reenviar é seguro.
    retry: 'classroom-create-error',
    payload: (values) => values,
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>{m.admin_classrooms_create()}</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={onSubmit}>
        <Card>
          <CardContent>
            <ClassroomFormFields form={form} idPrefix="classroom" />
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
