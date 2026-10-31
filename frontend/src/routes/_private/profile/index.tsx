import { createFileRoute } from '@tanstack/react-router'

import { accountQueryOptions } from '#/integrations/tanstack-query/queries/account'

/**
 * The account's own record: name, e-mail, avatar, role, status and since
 * when it exists - everything `GET /account` answers.
 *
 * Reading and editing are separate routes, as in the reference. Role and status only
 * appear here: `PUT /account` does not accept them, because the role is the decision of
 * whoever creates the account and nobody deactivates themselves. Both belong to the
 * `/administrator/users` module, on someone else's account.
 *
 * The `loader` reuses the same `queryOptions` as the guard in `_private/layout.tsx`, with
 * the same key: no new request goes out here, the cache is already full.
 */
export const Route = createFileRoute('/_private/profile/')({
  loader: ({ context }) =>
    context.queryClient.query({
      ...accountQueryOptions(),
      staleTime: 'static',
    }),
})
