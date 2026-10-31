import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from '@interclasse/shared'
import type {
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query'
import type * as React from 'react'
import { useForm } from 'react-hook-form'
import type {
  DefaultValues,
  FieldPath,
  FieldValues,
  UseFormReturn,
} from 'react-hook-form'
import { toast } from 'sonner'

import { useUnsavedChangesBlocker } from '#/hooks/use-unsaved-changes-blocker'
import type { HTTPError } from '#/integrations/tanstack-query/http'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { applyMutationError } from '#/lib/form-errors'

/**
 * The resource's mutation hook, as the form receives it.
 *
 * All the ones in `integrations/tanstack-query/mutations/` have this shape: they
 * accept `useMutation`'s options minus `mutationFn`, which they supply
 * themselves. That is what allows passing the hook as an argument instead of
 * calling it in the form's file.
 */
export type ResourceMutation<TRecord, TPayload> = (
  options?: Omit<
    UseMutationOptions<TRecord, HTTPError, TPayload>,
    'mutationFn'
  >,
) => UseMutationResult<TRecord, HTTPError, TPayload>

export type UseMutationFormOptions<
  TValues extends FieldValues,
  TRecord,
  TPayload,
> = Readonly<{
  /** The Zod validator from `@interclasse/shared`, the same one the backend uses. */
  validator: z.ZodType<TValues, TValues>
  /** The empty form. */
  defaults?: DefaultValues<TValues>
  /**
   * The loaded record, when editing. `values` and not `defaultValues`: the
   * record arrives after the first render, and `defaultValues` is only read
   * once.
   */
  values?: TValues
  /** The fields the backend may flag, so the error lands in the right place. */
  fields: ReadonlyArray<FieldPath<TValues>>
  mutation: ResourceMutation<TRecord, TPayload>
  /** The keys invalidated on success, before the notice and `onSuccess`. */
  invalidate?: ReadonlyArray<QueryKey>
  /** The success toast text. A function when it cites the saved record. */
  success?: string | ((record: TRecord) => string)
  /**
   * The id of the "Tentar de novo" notice, when resending is safe. The criterion
   * is in `applyMutationError`: an edit always can, a create only where the
   * use-case refuses the duplicate with 409.
   */
  retry?: string
  /**
   * What goes to the API. A create whose fields match the body one to one passes
   * `(values) => values`: it is the identity that makes the compiler check that
   * the form **is** the payload.
   */
  payload: (values: TValues) => TPayload
  /** What the screen does after saving: close the dialog, navigate. */
  onSuccess?: (record: TRecord, payload: TPayload) => Promise<void> | void
}>

export type UseMutationFormReturn<
  TValues extends FieldValues,
  TRecord,
  TPayload,
> = Readonly<{
  form: UseFormReturn<TValues>
  mutation: UseMutationResult<TRecord, HTTPError, TPayload>
  onValid: (values: TValues) => void
  /**
   * The `<form>`'s `onSubmit`, ready: `handleSubmit(onValid)` returns a promise,
   * and the JSX attribute expects `void`.
   */
  onSubmit: (event?: React.BaseSyntheticEvent) => void
}>

/**
 * A form that fires a mutation: `useForm` with the resolver of the `shared/`
 * validator, the mutation with the error carried to the fields
 * (`applyMutationError`), the invalidation, the success notice and an `onValid`
 * that clears the `root` before resending.
 *
 * It is the base of `useResourceForm` (the create/edit screen, which still
 * navigates back) and serves on its own anyone who is not a screen: score dialog,
 * draw, inline creation, login.
 */
export function useMutationForm<
  TValues extends FieldValues,
  TRecord,
  TPayload,
>({
  validator,
  defaults,
  values,
  fields,
  mutation: useResourceMutation,
  invalidate = [],
  success,
  retry,
  payload: toPayload,
  onSuccess,
}: UseMutationFormOptions<TValues, TRecord, TPayload>): UseMutationFormReturn<
  TValues,
  TRecord,
  TPayload
> {
  const invalidateKeys = useInvalidate()

  const form = useForm<TValues>({
    resolver: zodResolver(validator),
    mode: 'onTouched',
    defaultValues: defaults,
    values,
  })

  function retryOption(sent: TPayload) {
    if (!retry) return undefined

    return { id: retry, onClick: () => mutation.mutate(sent) }
  }

  const mutation = useResourceMutation({
    onError: function (error, sent) {
      applyMutationError({ form, error, fields, retry: retryOption(sent) })
    },
    async onSuccess(record, sent) {
      await invalidateKeys(invalidate)

      if (typeof success === 'string') toast.success(success)
      else if (success) toast.success(success(record))

      await onSuccess?.(record, sent)
    },
  })

  // Typed change not yet sent: leaving the screen asks first. After
  // sending, the success navigation passes freely.
  useUnsavedChangesBlocker(
    form.formState.isDirty && !mutation.isPending && !mutation.isSuccess,
  )

  function onValid(submitted: TValues): void {
    // The `root` holds the previous attempt's error. Without clearing it, an already
    // resolved 409 stays in the footer while the second attempt is in flight.
    form.clearErrors('root')

    mutation.mutate(toPayload(submitted))
  }

  function onSubmit(event?: React.BaseSyntheticEvent): void {
    void form.handleSubmit(onValid)(event)
  }

  return { form, mutation, onValid, onSubmit }
}
