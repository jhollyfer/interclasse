import { createLazyFileRoute } from '@tanstack/react-router'

import { AnnouncementsTable } from './-components/table'

export const Route = createLazyFileRoute(
  '/_private/administrator/announcements/',
)({
  component: AnnouncementsTable,
})
