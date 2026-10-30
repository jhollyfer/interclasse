import type { AdministratorSportCreatePayload } from '@interclasse/shared'
import type * as React from 'react'
import type { DefaultValues, UseFormReturn } from 'react-hook-form'

import { FieldDescription, FieldGroup } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { m } from '#/paraglide/messages'

export type SportFormType = AdministratorSportCreatePayload

export const SPORT_FORM_DEFAULTS: DefaultValues<SportFormType> = {
  name: '',
  minAthletes: 1,
  maxAthletes: 12,
}

export const SPORT_FIELDS = ['name', 'minAthletes', 'maxAthletes'] as const

type SportFormFieldsProps = Readonly<{
  form: UseFormReturn<SportFormType>
  idPrefix: string
}>

export function SportFormFields({
  form,
  idPrefix,
}: SportFormFieldsProps): React.JSX.Element {
  return (
    <FieldGroup>
      <AppFormRootError form={form} />

      <AppField
        control={form.control}
        name="name"
        id={`${idPrefix}-name`}
        label={m.admin_common_name()}
      >
        {({ field, control }) => (
          <>
            <Input
              {...field}
              {...control}
              placeholder={m.admin_sports_field_name_placeholder()}
            />
            <FieldDescription>
              {m.admin_sports_field_name_description()}
            </FieldDescription>
          </>
        )}
      </AppField>

      <div className="grid gap-4 sm:grid-cols-2">
        <AppField
          control={form.control}
          name="minAthletes"
          id={`${idPrefix}-min`}
          label={m.admin_sports_field_min()}
        >
          {({ field, control }) => (
            <>
              <Input
                {...control}
                type="number"
                inputMode="numeric"
                min={1}
                value={field.value}
                onChange={(event) => field.onChange(event.target.valueAsNumber)}
                onBlur={field.onBlur}
              />
              <FieldDescription>
                {m.admin_sports_field_min_description()}
              </FieldDescription>
            </>
          )}
        </AppField>

        <AppField
          control={form.control}
          name="maxAthletes"
          id={`${idPrefix}-max`}
          label={m.admin_sports_field_max()}
        >
          {({ field, control }) => (
            <Input
              {...control}
              type="number"
              inputMode="numeric"
              min={1}
              value={field.value}
              onChange={(event) => field.onChange(event.target.valueAsNumber)}
              onBlur={field.onBlur}
            />
          )}
        </AppField>
      </div>
    </FieldGroup>
  )
}
