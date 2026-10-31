import type { UseMutationOptions } from '@tanstack/react-query'

import type { HTTPError } from '#/integrations/tanstack-query/http'

/**
 * The options every hook in this file accepts: the TanStack Query contract
 * minus `mutationFn`, which is what the hook holds.
 *
 * Twenty-six types wrote this same shape out in full, each only swapping the
 * `<data, payload>` pair - and nothing guaranteed they stayed equal. Ported from
 * `lowcodejs`, which had already factored the shape out.
 *
 * The generics must come filled in: they have defaults (`TVariables = void`) and,
 * with `strictFunctionTypes`, the callbacks' parameter is contravariant - left
 * unfilled, the resulting function does not accept the payload.
 *
 * `TError` defaults to `HTTPError` because every failure path of `request()`
 * throws `HTTPError` - that is what `register.d.ts` declares in
 * `Register.defaultError`. Anything that does not go through `request()` states
 * it: the multipart upload talks to the bucket directly and can throw a raw `Error`.
 */
export type MutationProps<TData, TPayload, TError = HTTPError> = Omit<
  UseMutationOptions<TData, TError, TPayload>,
  'mutationFn'
>
