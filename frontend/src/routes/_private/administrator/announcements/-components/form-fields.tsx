import type * as React from 'react'
import { Controller } from 'react-hook-form'
import type { DefaultValues, UseFormReturn } from 'react-hook-form'
import type { AdministratorAnnouncementCreatePayload } from '@interclasse/shared'

import { Checkbox } from '#/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'

export type AnnouncementFormType = AdministratorAnnouncementCreatePayload

export const ANNOUNCEMENT_FORM_DEFAULTS: DefaultValues<AnnouncementFormType> = {
  title: '',
  body: '',
  pinned: false,
}

export const ANNOUNCEMENT_FIELDS = ['title', 'body', 'pinned'] as const

type AnnouncementFormFieldsProps = Readonly<{
  form: UseFormReturn<AnnouncementFormType>
  idPrefix: string
}>

export function AnnouncementFormFields({
  form,
  idPrefix,
}: AnnouncementFormFieldsProps): React.JSX.Element {
  return (
    <FieldGroup>
      <AppFormRootError form={form} />

      <AppField
        control={form.control}
        name="title"
        id={`${idPrefix}-title`}
        label="Título"
      >
        {({ field, control }) => (
          <Input {...field} {...control} placeholder="Troca de horário" />
        )}
      </AppField>

      <AppField
        control={form.control}
        name="body"
        id={`${idPrefix}-body`}
        label="Texto"
      >
        {({ field, control }) => <Textarea {...field} {...control} rows={5} />}
      </AppField>

      {/* Caixa de marcar: o rótulo vem depois do controle, então fica fora do
          `AppField`, que desenha rótulo, controle e erro nessa ordem. */}
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
