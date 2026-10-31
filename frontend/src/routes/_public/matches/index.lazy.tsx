import { createLazyFileRoute } from '@tanstack/react-router'

import { MatchesPage } from './-components/matches-page'

export const Route = createLazyFileRoute('/_public/matches/')({
  component: MatchesPage,
})
