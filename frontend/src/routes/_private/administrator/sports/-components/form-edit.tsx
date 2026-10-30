import { AdministratorSportCreateValidator } from '@interclasse/shared'
import type {
  AdministratorSportUpdatePayload,
  AdministratorSportShowResponse,
  Merge,
} from '@interclasse/shared'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
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
import { useSportUpdateMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { sportQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { m } from '#/paraglide/messages'

import type { SportFormType } from './form-fields'
import { SPORT_FIELDS, SportFormFields } from './form-fields'

const route = getRouteApi('/_private/administrator/sports/$id/edit')

/** Valida com o schema de criação: campo obrigatório não pode ser apagado. */
export function SportFormEdit(): React.JSX.Element {
  const { id } = route.useParams()
  const { data: sport } = useSuspenseQuery(sportQueryOptions(id))

  const { form, onSubmit, shell } = useResourceForm<
    SportFormType,
    AdministratorSportShowResponse,
    Merge<AdministratorSportUpdatePayload, { id: string }>
  >({
    formId: 'sport-update',
    validator: AdministratorSportCreateValidator,
    values: {
      name: sport.name,
      minAthletes: sport.minAthletes,
      maxAthletes: sport.maxAthletes,
    },
    fields: SPORT_FIELDS,
    mutation: useSportUpdateMutation,
    invalidate: queryKeys.administrator.sports.all,
    alsoInvalidate: DEPENDENTS.sports,
    backTo: '/administrator/sports',
    success: (updated) => m.admin_sports_saved({ name: updated.name }),
    retry: 'sport-update-error',
    payload: (values) => ({ ...values, id }),
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>
          {m.admin_common_edit_named({ name: sport.name })}
        </FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={onSubmit}>
        <Card>
          <CardContent>
            <SportFormFields form={form} idPrefix="edit-sport" />
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
