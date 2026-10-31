import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { useAuthenticationSignOutMutation } from '#/integrations/tanstack-query/mutations/authentication'

/**
 * Signing out of the dashboard: ends the session, empties the cache and goes back to the sign-in.
 *
 * A hook and not repeated markup because sign-out lives in **two** places - the
 * avatar menu in the header and the sidebar footer -, and the delicate part is
 * the order of the three things below. Written twice, it only takes one of them
 * aging for the second sign-out to leave a trace of the previous session.
 *
 * Returns the whole mutation: the caller needs `isPending` to disable its
 * own button.
 */
export function useSignOut() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useAuthenticationSignOutMutation({
    // `onSettled` and not `onSuccess`: if the access token has already expired, the endpoint
    // answers 401 and the session dies all the same - whatever remains wins
    // on its own. Clearing the cache only on success would leave the previous user's
    // name in the header of whoever signs in next.
    async onSettled() {
      // The whole cache, not only `account`: the dashboard, the listings and the records
      // are all data from a session that has just ceased to exist.
      queryClient.clear()

      // After clearing, not before: navigating first remounts the `_private`
      // guard over a cache that still holds the old session, and it would let
      // it through.
      await router.navigate({ to: '/sign-in' })
    },
  })
}
