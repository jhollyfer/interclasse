import { createLazyFileRoute } from '@tanstack/react-router'

import { StandingsPage } from './-components/standings-page'

export const Route = createLazyFileRoute('/_public/classificacao/')({
  component: StandingsPage,
})
