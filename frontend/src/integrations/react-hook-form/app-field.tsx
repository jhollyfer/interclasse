import type * as React from 'react'
import { Controller } from 'react-hook-form'
import type {
  Control,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
  UseFormReturn,
} from 'react-hook-form'

import { Alert, AlertDescription } from '#/components/ui/alert'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { errorId, invalidProps } from '#/lib/form-a11y'

/** What a field's control receives to bind itself to the label and the error. */
export type AppFieldBinding<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = Readonly<{
  field: ControllerRenderProps<TValues, TName>
  /** Spread on the control: links the `<label>` and marks the field invalid. */
  control: Readonly<{
    id: string
    'aria-invalid': boolean
    'aria-describedby'?: string
  }>
}>

type AppFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = Readonly<{
  control: Control<TValues>
  name: TName
  /** The control's `id`, which the `<label>` points at. */
  id: string
  label: React.ReactNode
  /** The control and whatever comes after it (description), from the binding. */
  children: (binding: AppFieldBinding<TValues, TName>) => React.ReactNode
}>

/**
 * A form field: React Hook Form's `Controller`, label, control and
 * the validator's error message, always in the same order.
 *
 * Forms used to write this block by hand in every field - `data-invalid` on
 * `Field`, `htmlFor` equal to the `id`, `aria-invalid` on the control, `FieldError`
 * only when invalid -, and each copy was a chance to forget one of the four.
 * The control still belongs to whoever uses it: input, textarea, combobox, number.
 */
export function AppField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
>({
  control,
  name,
  id,
  label,
  children,
}: AppFieldProps<TValues, TName>): React.JSX.Element {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {children({
            field,
            control: { id, ...invalidProps(fieldState.invalid, id) },
          })}
          {fieldState.invalid && (
            <FieldError id={errorId(id)} errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  )
}

/**
 * The whole form's error (`root`): what the API refused without pointing at a
 * field. Nothing appears while there is no error.
 */
export function AppFormRootError<TValues extends FieldValues>({
  form,
}: Readonly<{ form: UseFormReturn<TValues> }>): React.JSX.Element | null {
  const root = form.formState.errors.root
  if (!root) return null

  return (
    <Alert data-slot="app-form-root-error" variant="destructive">
      <AlertDescription>{root.message}</AlertDescription>
    </Alert>
  )
}
