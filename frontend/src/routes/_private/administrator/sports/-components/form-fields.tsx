import type * as React from 'react'
import { Controller } from 'react-hook-form'
import type { DefaultValues, UseFormReturn } from 'react-hook-form'

import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import type { SportCreatePayload } from '#/validators/administrator/sports.validator'

export type SportFormType = SportCreatePayload

export const SPORT_FORM_DEFAULTS: DefaultValues<SportFormType> = {
  name: '',
  minAthletes: 1,
  maxAthletes: 12,
}

export const SPORT_FIELDS = ['name', 'minAthletes', 'maxAthletes'] as const

export function SportFormFields({
  form,
  idPrefix,
}: {
  form: UseFormReturn<SportFormType>
  idPrefix: string
}): React.JSX.Element {
  const { errors } = form.formState

  return (
    <FieldGroup>
      {errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}

      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-name`}>Nome</FieldLabel>
            <Input
              {...field}
              id={`${idPrefix}-name`}
              aria-invalid={fieldState.invalid}
              placeholder="Futsal"
            />
            <FieldDescription>
              Vira o endereço da modalidade no site.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name="minAthletes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${idPrefix}-min`}>
                Mínimo de atletas
              </FieldLabel>
              <Input
                id={`${idPrefix}-min`}
                type="number"
                inputMode="numeric"
                min={1}
                value={field.value}
                onChange={(event) => field.onChange(event.target.valueAsNumber)}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Turma com menos inscritos fica fora do sorteio.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="maxAthletes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${idPrefix}-max`}>
                Máximo de atletas
              </FieldLabel>
              <Input
                id={`${idPrefix}-max`}
                type="number"
                inputMode="numeric"
                min={1}
                value={field.value}
                onChange={(event) => field.onChange(event.target.valueAsNumber)}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
    </FieldGroup>
  )
}
