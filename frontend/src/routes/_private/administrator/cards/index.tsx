import { createFileRoute } from '@tanstack/react-router'

import { cardsQueryOptions } from '#/integrations/tanstack-query/queries'

/** Todos de uma vez: um campeonato da escola não passa de poucas dezenas. */
export const ADMINISTRATOR_CARDS = { perPage: 100 }

export const Route = createFileRoute('/_private/administrator/cards/')({
  loader: ({ context }) =>
    context.queryClient.query(cardsQueryOptions(ADMINISTRATOR_CARDS)),
})
