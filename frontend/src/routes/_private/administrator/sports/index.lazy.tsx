import { createLazyFileRoute } from '@tanstack/react-router'
import { SportsTable } from './-components/table'

export const Route = createLazyFileRoute('/_private/administrator/sports/')({
  component: SportsTable,
})
