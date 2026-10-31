import type { Merge } from '@interclasse/shared'
import type { QueryKey } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import type { FieldValues } from 'react-hook-form'

import { useMutationForm } from './use-mutation-form'
import type {
  UseMutationFormOptions,
  UseMutationFormReturn,
} from './use-mutation-form'

type UseResourceFormOptions<
  TValues extends FieldValues,
  TRecord,
  TPayload,
> = Merge<
  Omit<
    UseMutationFormOptions<TValues, TRecord, TPayload>,
    | 'formId'
    | 'invalidate'
    | 'alsoInvalidate'
    | 'backTo'
    | 'backParams'
    | 'onSuccess'
  >,
  Readonly<{
    /** The `<form>` id, which links the header's `Salvar` to the scrolling form. */
    formId: string
    /** The resource's own key, invalidated on success. */
    invalidate: QueryKey
    /**
     * Other keys the record feeds: a classroom's name shows up in the
     * scoreboard, so saving a classroom also invalidates matches and the site.
     */
    alsoInvalidate?: ReadonlyArray<QueryKey>
    /** Where it goes back to after saving, and where the arrow and `Descartar` point. */
    backTo: LinkProps['to']
    backParams?: LinkProps['params']
    /**
     * What to do after saving, instead of going back to `backTo`. This is the
     * profile case: changing e-mail or password drops the session, and the
     * destination becomes the login.
     */
    onSuccess?: UseMutationFormOptions<TValues, TRecord, TPayload>['onSuccess']
  }>
>

type UseResourceFormReturn<
  TValues extends FieldValues,
  TRecord,
  TPayload,
> = Merge<
  Omit<UseMutationFormReturn<TValues, TRecord, TPayload>, 'shell'>,
  Readonly<{
    /** The `FormShell`'s four props, ready to spread. */
    shell: {
      readonly formId: string
      readonly backTo: LinkProps['to']
      readonly backParams?: LinkProps['params']
      readonly isPending: boolean
    }
  }>
>

/**
 * The wiring of a dashboard create or edit form: `useMutationForm` plus the
 * return to `backTo` and the `FormShell` props.
 *
 * It draws nothing: the visual shell remains `common/form-shell/`, and the
 * fields remain in each folder's `form-fields.tsx`.
 *
 * **Editing validates with the create validator, not the update one.** The
 * update one is all `.optional()` - right for the API, because `PUT` is
 * partial, and terrible as a screen rule: the user would erase the name, the
 * form would approve it, the API would read the empty field as "leave alone"
 * and the name would stay the old one with no warning at all. The payload
 * stays valid for `PUT` precisely because everything there is optional.
 */
export function useResourceForm<
  TValues extends FieldValues,
  TRecord,
  TPayload,
>({
  formId,
  invalidate,
  alsoInvalidate = [],
  backTo,
  backParams,
  onSuccess,
  ...options
}: UseResourceFormOptions<TValues, TRecord, TPayload>): UseResourceFormReturn<
  TValues,
  TRecord,
  TPayload
> {
  const router = useRouter()

  const resource = useMutationForm<TValues, TRecord, TPayload>({
    ...options,
    invalidate: [invalidate, ...alsoInvalidate],
    async onSuccess(record, sent) {
      if (onSuccess) {
        await onSuccess(record, sent)
        return
      }

      await router.navigate({ to: backTo, params: backParams })
    },
  })

  return {
    ...resource,
    shell: {
      formId,
      backTo,
      backParams,
      isPending: resource.mutation.isPending,
    },
  }
}
