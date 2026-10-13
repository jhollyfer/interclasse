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
import { SPORT_FIELDS, SportFormFields } from './form-fields'
import type { SportFormType } from './form-fields'
import { AdministratorSportCreateValidator } from '#/validators/administrator/sports.validator'
import type { Sport } from '#/lib/validator'
import type { AdministratorSportUpdatePayload } from '#/validators/administrator/sports.validator'
import type { Merge } from '#/lib/interfaces'
import { sportQueryOptions } from '#/integrations/tanstack-query/queries'
import { useSportUpdate } from '#/integrations/tanstack-query/mutations'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useResourceForm } from '#/hooks/use-resource-form'

const route = getRouteApi('/_private/administrator/sports/$id/edit')

/** Valida com o schema de criação: campo obrigatório não pode ser apagado. */
export function SportFormEdit(): React.JSX.Element {
  const { id } = route.useParams()
  const { data: sport } = useSuspenseQuery(sportQueryOptions(id))

  const { form, onValid, shell } = useResourceForm<
    SportFormType,
    Sport,
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
    mutation: useSportUpdate,
    invalidate: queryKeys.sports.all,
    alsoInvalidate: DEPENDENTS.sports,
    backTo: '/administrator/sports',
    success: (updated) => `Modalidade ${updated.name} salva.`,
    retry: 'sport-update-error',
    payload: (values) => ({ ...values, id }),
  })

  return (
    <FormShell {...shell}>
      <FormShellHeader>
        <FormShellBack />
        <FormShellTitle>Editar {sport.name}</FormShellTitle>
        <FormShellActions>
          <FormShellDiscard />
          <FormShellSubmit />
        </FormShellActions>
      </FormShellHeader>

      <FormShellContent onSubmit={form.handleSubmit(onValid)}>
        <Card>
          <CardContent>
            <SportFormFields form={form} idPrefix="edit-sport" />
          </CardContent>
        </Card>
      </FormShellContent>
    </FormShell>
  )
}
