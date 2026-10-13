import type * as React from 'react'
import { Controller } from 'react-hook-form'
import type { DefaultValues, UseFormReturn } from 'react-hook-form'

import { Alert, AlertDescription } from '#/components/ui/alert'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import type { AnnouncementCreatePayload } from '#/validators/administrator/announcements.validator'

export type AnnouncementFormType = AnnouncementCreatePayload

export const ANNOUNCEMENT_FORM_DEFAULTS: DefaultValues<AnnouncementFormType> = {
  title: '',
  body: '',
  pinned: false,
}

export const ANNOUNCEMENT_FIELDS = ['title', 'body', 'pinned'] as const

export function AnnouncementFormFields({
  form,
  idPrefix,
}: {
  form: UseFormReturn<AnnouncementFormType>
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
        name="title"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-title`}>Título</FieldLabel>
            <Input
              {...field}
              id={`${idPrefix}-title`}
              aria-invalid={fieldState.invalid}
              placeholder="Troca de horário"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="body"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-body`}>Texto</FieldLabel>
            <Textarea
              {...field}
              id={`${idPrefix}-body`}
              rows={5}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="pinned"
        control={form.control}
        render={({ field }) => (
          <Field orientation="horizontal">
            <Checkbox
              id={`${idPrefix}-pinned`}
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <FieldLabel htmlFor={`${idPrefix}-pinned`}>
              Fixar no topo do site
            </FieldLabel>
            <FieldDescription className="sr-only">
              Aviso fixado aparece antes dos demais.
            </FieldDescription>
          </Field>
        )}
      />
    </FieldGroup>
  )
}
