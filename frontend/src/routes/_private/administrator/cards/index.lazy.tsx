import { createLazyFileRoute } from '@tanstack/react-router'

import { CardsPage } from './-components/cards-page'

export const Route = createLazyFileRoute('/_private/administrator/cards/')({
  component: CardsPage,
})
