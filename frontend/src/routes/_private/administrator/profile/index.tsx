import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * The address the previous frontend served, pointed at where the screen lives
 * today.
 *
 * In `frontend-old` the account itself was `/administrator/profile`; here it is
 * `/profile`, as in the reference. Whoever has the old address saved, in a
 * bookmark or in a link pasted somewhere, would land on a 404 - and a 404
 * on a route that existed is indistinguishable from a broken dashboard.
 *
 * `beforeLoad` and not `component`: the redirect happens before mounting
 * anything, so no empty screen flashes on the way. No `component`
 * because nothing gets rendered.
 */
export const Route = createFileRoute('/_private/administrator/profile/')({
  beforeLoad: () => {
    throw redirect({ to: '/profile' })
  },
})
