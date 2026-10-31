import { createLazyFileRoute } from '@tanstack/react-router'

import { BracketPage } from './-components/bracket-page'

export const Route = createLazyFileRoute('/_public/standings/$id/')({
  component: BracketPage,
})
