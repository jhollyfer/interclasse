import { createLazyFileRoute } from '@tanstack/react-router'

import { GamesPage } from './-components/games-page'

export const Route = createLazyFileRoute('/_public/jogos/')({
  component: GamesPage,
})
