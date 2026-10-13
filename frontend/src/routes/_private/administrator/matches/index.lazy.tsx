import { createLazyFileRoute } from '@tanstack/react-router'

import { MatchesTable } from './-components/table'

export const Route = createLazyFileRoute('/_private/administrator/matches/')({
  component: MatchesTable,
})
