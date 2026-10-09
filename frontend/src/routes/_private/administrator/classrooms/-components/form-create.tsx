import type * as React from 'react'

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
import {
  CLASSROOM_FIELDS,
  CLASSROOM_FORM_DEFAULTS,
  ClassroomFormFields,
} from './form-fields'
import type { ClassroomFormType } from './form-fields'
import { AdministratorClassroomCreateValidator } from '#/lib/validator'
import type {
  AdministratorClassroomCreatePayload,
  Classroom,
} from '#/lib/validator'
import { useClassroomCreate } from '#/integrations/tanstack-query/mutations'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'

export function ClassroomFormCreate(): React.JSX.Element {
  const { form, onValid, shell } = useResourceForm<
    ClassroomFormType,
    Classroom,
    AdministratorClassroomCreatePayload
  >({
    formId: 'classroom-create',
    validator: AdministratorClassroomCreateValidator,
    defaults: CLASSROOM_FORM_DEFAULTS,
    fields: CLASSROOM_FIELDS,
    mutation: useClassroomCreate,
    invalidate: queryKeys.classrooms.all,
    alsoInvalidate: DEPENDENTS.classrooms,
    backTo: '/administrator/classrooms',
    success: (classroom) => `Turma ${classroom.name} criada.`,
    // Nome repetido é `409 CLASSROOM_ALREADY_EXISTS`: reenviar é seguro.
    retry: 'classroom-create-error',
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>Adicionar turma</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={form.handleSubmit(onValid)}>
        <Card>
          <CardContent>
            <ClassroomFormFields form={form} idPrefix="classroom" />
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
