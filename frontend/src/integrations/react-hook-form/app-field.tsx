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

/** O que o controle de um campo recebe para se ligar ao rótulo e ao erro. */
export type AppFieldBinding<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = Readonly<{
  field: ControllerRenderProps<TValues, TName>
  /** Espalhe no controle: liga o `<label>` e marca o campo inválido. */
  control: Readonly<{ id: string; 'aria-invalid': boolean }>
}>

type AppFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = Readonly<{
  control: Control<TValues>
  name: TName
  /** O `id` do controle, que o `<label>` aponta. */
  id: string
  label: React.ReactNode
  /** O controle e o que vier depois dele (descrição), a partir do binding. */
  children: (binding: AppFieldBinding<TValues, TName>) => React.ReactNode
}>

/**
 * Um campo do formulário: `Controller` do React Hook Form, rótulo, controle e
 * a mensagem de erro do validator, sempre na mesma ordem.
 *
 * Os formulários escreviam esse bloco à mão em cada campo - `data-invalid` no
 * `Field`, `htmlFor` igual ao `id`, `aria-invalid` no controle, `FieldError`
 * só quando inválido -, e cada cópia era uma chance de esquecer uma das quatro.
 * O controle continua sendo de quem usa: input, textarea, combobox, número.
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
            control: { id, 'aria-invalid': fieldState.invalid },
          })}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

/**
 * O erro do formulário inteiro (`root`): o que a API recusou sem apontar um
 * campo. Nada aparece enquanto não houver erro.
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
