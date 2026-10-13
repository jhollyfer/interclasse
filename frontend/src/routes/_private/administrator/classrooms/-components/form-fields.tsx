import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { OptionCombobox } from '#/components/common/option-combobox'
import { UserRoles } from '#/lib/entity'
import type { UserRole } from '#/lib/entity'
import { usersQueryOptions } from '#/integrations/tanstack-query/queries'
import type { ClassroomCreatePayload } from '#/validators/administrator/classrooms.validator'

export type ClassroomFormType = ClassroomCreatePayload

export const CLASSROOM_FORM_DEFAULTS: DefaultValues<ClassroomFormType> = {
  name: '',
  advisorId: null,
  representativeId: null,
}

export const CLASSROOM_FIELDS = [
  'name',
  'grade',
  'advisorId',
  'representativeId',
] as const

const GRADE_OPTIONS = [3, 4, 5, 6, 7, 8, 9].map((grade) => ({
  value: String(grade),
  label: `${grade}º ano`,
}))

/** As contas de um papel, como opções. 100 cobre a escola inteira. */
function usePeople(role: UserRole) {
  const { data } = useQuery(
    usersQueryOptions({ role, perPage: 100, sort: 'name' }),
  )

  return [
    { value: '', label: 'Nenhum' },
    ...(data?.data ?? []).map((user) => ({ value: user.id, label: user.name })),
  ]
}

export function ClassroomFormFields({
  form,
  idPrefix,
}: {
  form: UseFormReturn<ClassroomFormType>
  idPrefix: string
}): React.JSX.Element {
  const { errors } = form.formState
  const advisors = usePeople(UserRoles.ADVISOR)
  const representatives = usePeople(UserRoles.REPRESENTATIVE)

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
              placeholder="9º A"
            />
            <FieldDescription>É o nome que aparece no placar.</FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="grade"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-grade`}>Ano</FieldLabel>
            <OptionCombobox
              id={`${idPrefix}-grade`}
              // Na criação o ano nasce ausente: `String(undefined)` não casa
              // com opção nenhuma, e o combobox mostra o vazio.
              value={String(field.value)}
              onValueChange={(value) => field.onChange(Number(value))}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid}
              options={GRADE_OPTIONS}
            />
            <FieldDescription>
              Do 3º ao 5º é Fundamental 1; do 6º ao 9º, Fundamental 2.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="advisorId"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-advisor`}>
              Professor conselheiro
            </FieldLabel>
            <OptionCombobox
              id={`${idPrefix}-advisor`}
              value={field.value ?? ''}
              onValueChange={(value) => field.onChange(value || null)}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid}
              options={advisors}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="representativeId"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-representative`}>
              Aluno representante
            </FieldLabel>
            <OptionCombobox
              id={`${idPrefix}-representative`}
              value={field.value ?? ''}
              onValueChange={(value) => field.onChange(value || null)}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid}
              options={representatives}
            />
            <FieldDescription>
              As contas saem de Usuários, com o papel de representante.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  )
}
