import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import type * as React from 'react'

import { accountQueryOptions } from '#/integrations/tanstack-query/queries/account'
import { m } from '#/paraglide/messages'

import { validateSearch } from './-search'

/**
 * The inverse guard: whoever already has a session does not see the sign-in form. It stays in the
 * layout for the same reason as `_private` - a new authentication screen is born
 * covered by being in the right place.
 */
export const Route = createFileRoute('/_authentication')({
  validateSearch,
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.query({
        ...accountQueryOptions(),
        staleTime: 'static',
      })
    } catch {
      // Having no session is this area's normal case: carry on to the form.
      return
    }

    // Outside the `try`: a `redirect` is thrown, and thrown from inside it would be
    // caught by the very `catch` that exists for the opposite case - and the
    // symptom would be a login that accepts the password and does not move.
    //
    // A single destination, and not one per role as in the reference: here the roles
    // all enter the same dashboard, and the difference
    // between them is the backend's `403` on `/administrator/users`.
    throw redirect({ to: '/dashboard' })
  },
  head: () => ({
    meta: [
      { title: `${m.auth_page_title()} | ${m.common_site_title()}` },
      // Authentication screen outside the index (`frontend.md` §9.7).
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: RouteComponent,
})

function RouteComponent(): React.JSX.Element {
  return <Outlet />
}
