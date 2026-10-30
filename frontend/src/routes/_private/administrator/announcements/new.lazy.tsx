import { createLazyFileRoute } from '@tanstack/react-router'

import { AnnouncementFormCreate } from './-components/form-create'

export const Route = createLazyFileRoute(
  '/_private/administrator/announcements/new',
)({
  component: AnnouncementFormCreate,
})
