import { createFileRoute } from '@tanstack/react-router'

import { accountQueryOptions } from '#/integrations/tanstack-query/queries/account'

/**
 * Editing the account itself: name, e-mail, avatar and the password change.
 *
 * The same `queryOptions` as the record and the layout's guard, with the same key: arriving
 * here through the "Editar perfil" button triggers no new request.
 */
export const Route = createFileRoute('/_private/profile/edit/')({
  loader: ({ context }) =>
    context.queryClient.query({
      ...accountQueryOptions(),
      staleTime: 'static',
    }),
})
