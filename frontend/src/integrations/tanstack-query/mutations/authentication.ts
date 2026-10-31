import type { AuthenticationSessionSignInPayload } from '@interclasse/shared'
import { useMutation } from '@tanstack/react-query'

import type { MutationProps } from '#/hooks/tanstack-query/_mutation-props'

import type { HTTPError } from '../http'
import { send } from '../http'

/**
 * Signs in. Answers `204` and delivers the two tokens in `Set-Cookie`, `httpOnly` -
 * there is nothing to store on screen, and whoever comes to know who is logged in is
 * `GET /account`.
 */
export function useAuthenticationSignInMutation(
  options?: MutationProps<void, AuthenticationSessionSignInPayload>,
) {
  // The generics stay explicit: they are what gives contextual typing to the
  // caller's callbacks. The "type the queryFn, not the hook" rule holds for
  // queries, where `select` and `data` depend on chained inference.
  return useMutation<void, HTTPError, AuthenticationSessionSignInPayload>({
    ...options,
    mutationFn: async function (payload) {
      await send('/authentication/sign-in', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

/** Ends the session on the server, and not only on screen. */
export function useAuthenticationSignOutMutation(
  options?: MutationProps<void, void>,
) {
  return useMutation<void, HTTPError, void>({
    ...options,
    mutationFn: async function () {
      await send('/authentication/sign-out', { method: 'POST' })
    },
  })
}
