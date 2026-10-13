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
import { SportCreateValidator } from '#/validators/administrator/sports.validator'
import type { ISport } from '#/lib/interfaces'
import type { SportCreatePayload } from '#/validators/administrator/sports.validator'
import { useSportCreate } from '#/integrations/tanstack-query/mutations'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'

import type { SportFormType } from './form-fields'
import {
  SPORT_FIELDS,
  SPORT_FORM_DEFAULTS,
  SportFormFields,
} from './form-fields'

export function SportFormCreate(): React.JSX.Element {
  const { form, onSubmit, shell } = useResourceForm<
    SportFormType,
    ISport,
    SportCreatePayload
  >({
    formId: 'sport-create',
    validator: SportCreateValidator,
    defaults: SPORT_FORM_DEFAULTS,
    fields: SPORT_FIELDS,
    mutation: useSportCreate,
    invalidate: queryKeys.sports.all,
    alsoInvalidate: DEPENDENTS.sports,
    backTo: '/administrator/sports',
    success: (sport) => `Modalidade ${sport.name} criada.`,
    // Nome repetido é `409 SPORT_ALREADY_EXISTS`: reenviar é seguro.
    retry: 'sport-create-error',
    payload: (values) => values,
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>Adicionar modalidade</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={onSubmit}>
        <Card>
          <CardContent>
            <SportFormFields form={form} idPrefix="sport" />
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
