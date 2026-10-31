import { createFileRoute } from '@tanstack/react-router'

import { TableSkeleton } from '#/components/common/table/table-skeleton'
import { cardsQueryOptions } from '#/integrations/tanstack-query/queries/administrator'

/** All at once: a school championship does not exceed a few dozen. */
export const ADMINISTRATOR_CARDS = { perPage: 100 }

export const Route = createFileRoute('/_private/administrator/cards/')({
  pendingComponent: () => <TableSkeleton />,
  loader: ({ context }) =>
    context.queryClient.query(cardsQueryOptions(ADMINISTRATOR_CARDS)),
})
