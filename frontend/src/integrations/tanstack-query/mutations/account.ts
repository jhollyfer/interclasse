import { AccountProfileShowResponse } from '@interclasse/shared'
import type { AccountProfileUpdatePayload } from '@interclasse/shared'
import { useMutation } from '@tanstack/react-query'

import type { MutationProps } from '#/hooks/tanstack-query/_mutation-props'

import type { HTTPError } from '../http'
import { request } from '../http'

/**
 * The account itself. No `id` in the payload or the path: the user always comes from the
 * session, and that is the same reason there is no `status` or `role` here -
 * nobody deactivates or promotes themselves.
 *
 * Changing the password takes down the current session, including the one that made this
 * request. Whoever calls decides what to do with that.
 *
 * `currentPassword` is only required when `password` **exists as a key** - the
 * backend's `requiredIfExists` looks at the key, not the value. A `password: ''`
 * becomes `null` and still counts as present, so the field must be **omitted**
 * from the payload, and not sent empty.
 */
export function useAccountUpdateMutation(
  options?: MutationProps<
    AccountProfileShowResponse,
    AccountProfileUpdatePayload
  >,
) {
  return useMutation<
    AccountProfileShowResponse,
    HTTPError,
    AccountProfileUpdatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request('/account', AccountProfileShowResponse, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
  })
}
