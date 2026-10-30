import type { AdministratorClassroomCreatePayload } from '@interclasse/shared'
import { USER_ROLE } from '@interclasse/shared'
import type * as React from 'react'
import type { DefaultValues, UseFormReturn } from 'react-hook-form'

import { OptionCombobox } from '#/components/common/option-combobox'
import { FieldDescription, FieldGroup } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { m } from '#/paraglide/messages'

import { PersonCombobox } from './person-combobox'

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

type ClassroomFormFieldsProps = Readonly<{
  form: UseFormReturn<ClassroomFormType>
  idPrefix: string
}>

export function ClassroomFormFields({
  form,
  idPrefix,
}: ClassroomFormFieldsProps): React.JSX.Element {
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
          <PersonCombobox
            {...control}
            role={USER_ROLE.ADVISOR}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
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
            <PersonCombobox
              {...control}
              role={USER_ROLE.REPRESENTATIVE}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
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
