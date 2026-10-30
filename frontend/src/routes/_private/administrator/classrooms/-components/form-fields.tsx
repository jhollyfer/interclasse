import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import type { DefaultValues, UseFormReturn } from 'react-hook-form'
import type {
  AdministratorClassroomCreatePayload,
  UserRole,
} from '@interclasse/shared'
import { USER_ROLE } from '@interclasse/shared'

import { FieldDescription, FieldGroup } from '#/components/ui/field'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { Input } from '#/components/ui/input'
import { OptionCombobox } from '#/components/common/option-combobox'
import { usersQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { m } from '#/paraglide/messages'

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

const GRADES = [3, 4, 5, 6, 7, 8, 9]

/** As contas de um papel, como opções. 100 cobre a escola inteira. */
function usePeople(role: UserRole) {
  const { data } = useQuery(
    usersQueryOptions({ role, perPage: 100, sort: 'name' }),
  )

  return [
    { value: '', label: m.admin_common_none() },
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
  const gradeOptions = GRADES.map((grade) => ({
    value: String(grade),
    label: m.admin_classrooms_grade_option({ grade }),
  }))

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
              placeholder={m.admin_classrooms_field_name_placeholder()}
            />
            <FieldDescription>
              {m.admin_classrooms_field_name_description()}
            </FieldDescription>
          </>
        )}
      </AppField>

      <AppField
        control={form.control}
        name="grade"
        id={`${idPrefix}-grade`}
        label={m.admin_classrooms_field_grade()}
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
              options={gradeOptions}
            />
            <FieldDescription>
              {m.admin_classrooms_field_grade_description()}
            </FieldDescription>
          </>
        )}
      </AppField>

      <AppField
        control={form.control}
        name="advisorId"
        id={`${idPrefix}-advisor`}
        label={m.admin_classrooms_field_advisor()}
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
        label={m.admin_classrooms_field_representative()}
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
              {m.admin_classrooms_field_representative_description()}
            </FieldDescription>
          </>
        )}
      </AppField>
    </FieldGroup>
  )
}
