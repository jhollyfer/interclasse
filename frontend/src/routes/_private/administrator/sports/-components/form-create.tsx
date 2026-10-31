import { AdministratorSportCreateValidator } from '@interclasse/shared'
import type {
  AdministratorSportCreatePayload,
  AdministratorSportShowResponse,
} from '@interclasse/shared'
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
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'
import { useSportCreateMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { m } from '#/paraglide/messages'

import type { SportFormType } from './form-fields'
import {
  SPORT_FIELDS,
  SPORT_FORM_DEFAULTS,
  SportFormFields,
} from './form-fields'

export function SportFormCreate(): React.JSX.Element {
  const { form, onSubmit, shell } = useResourceForm<
    SportFormType,
    AdministratorSportShowResponse,
    AdministratorSportCreatePayload
  >({
    formId: 'sport-create',
    validator: AdministratorSportCreateValidator,
    defaults: SPORT_FORM_DEFAULTS,
    fields: SPORT_FIELDS,
    mutation: useSportCreateMutation,
    invalidate: queryKeys.administrator.sports.all,
    alsoInvalidate: DEPENDENTS.sports,
    backTo: '/administrator/sports',
    success: (sport) => m.admin_sports_created({ name: sport.name }),
    // A repeated name is `409 SPORT_ALREADY_EXISTS`: resending is safe.
    retry: 'sport-create-error',
    payload: (values) => values,
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>{m.admin_sports_create()}</FormShellTitle>
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
