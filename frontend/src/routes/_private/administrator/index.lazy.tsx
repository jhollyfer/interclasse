import { createLazyFileRoute } from '@tanstack/react-router'

import { DashboardPage } from './-components/dashboard-page'

export const Route = createLazyFileRoute('/_private/administrator/')({
  component: DashboardPage,
})
