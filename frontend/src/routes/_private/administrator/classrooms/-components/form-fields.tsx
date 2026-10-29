import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import type { DefaultValues, UseFormReturn } from 'react-hook-form'
import type { AdministratorClassroomCreatePayload } from '@interclasse/shared'

import { FieldDescription, FieldGroup } from '#/components/ui/field'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { Input } from '#/components/ui/input'
import { OptionCombobox } from '#/components/common/option-combobox'
import { USER_ROLE } from '#/lib/entity'
import type { UserRole } from '#/lib/entity'
import { usersQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

export type ClassroomFormType = AdministratorClassroomCreatePayload

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

type ClassroomFormFieldsProps = Readonly<{
  form: UseFormReturn<ClassroomFormType>
  idPrefix: string
}>

export function ClassroomFormFields({
  form,
  idPrefix,
}: ClassroomFormFieldsProps): React.JSX.Element {
  const advisors = usePeople(USER_ROLE.ADVISOR)
  const representatives = usePeople(USER_ROLE.REPRESENTATIVE)

  return (
    <FieldGroup>
      <AppFormRootError form={form} />

      <AppField
        control={form.control}
        name="name"
        id={`${idPrefix}-name`}
        label="Nome"
      >
        {({ field, control }) => (
          <>
            <Input {...field} {...control} placeholder="9º A" />
            <FieldDescription>É o nome que aparece no placar.</FieldDescription>
          </>
        )}
      </AppField>

      <AppField
        control={form.control}
        name="grade"
        id={`${idPrefix}-grade`}
        label="Ano"
      >
        {({ field, control }) => (
          <>
            <OptionCombobox
              {...control}
              // Na criação o ano nasce ausente: `String(undefined)` não casa
              // com opção nenhuma, e o combobox mostra o vazio.
              value={String(field.value)}
              onValueChange={(value) => field.onChange(Number(value))}
              onBlur={field.onBlur}
              options={GRADE_OPTIONS}
            />
            <FieldDescription>
              Do 3º ao 5º é Fundamental 1; do 6º ao 9º, Fundamental 2.
            </FieldDescription>
          </>
        )}
      </AppField>

      <AppField
        control={form.control}
        name="advisorId"
        id={`${idPrefix}-advisor`}
        label="Professor conselheiro"
      >
        {({ field, control }) => (
          <OptionCombobox
            {...control}
            value={field.value ?? ''}
            onValueChange={(value) => field.onChange(value || null)}
            onBlur={field.onBlur}
            options={advisors}
          />
        )}
      </AppField>

      <AppField
        control={form.control}
        name="representativeId"
        id={`${idPrefix}-representative`}
        label="Aluno representante"
      >
        {({ field, control }) => (
          <>
            <OptionCombobox
              {...control}
              value={field.value ?? ''}
              onValueChange={(value) => field.onChange(value || null)}
              onBlur={field.onBlur}
              options={representatives}
            />
            <FieldDescription>
              As contas saem de Usuários, com o papel de representante.
            </FieldDescription>
          </>
        )}
      </AppField>
    </FieldGroup>
  )
}
