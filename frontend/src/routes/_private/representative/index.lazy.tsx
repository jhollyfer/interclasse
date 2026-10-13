import { createLazyFileRoute } from '@tanstack/react-router'

import { AthletesPage } from './-components/athletes-page'

export const Route = createLazyFileRoute('/_private/representative/')({
  component: AthletesPage,
})
