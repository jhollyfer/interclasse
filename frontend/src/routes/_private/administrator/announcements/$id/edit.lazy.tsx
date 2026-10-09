import { createLazyFileRoute } from '@tanstack/react-router'
import { AnnouncementFormEdit } from '../-components/form-edit'

export const Route = createLazyFileRoute(
  '/_private/administrator/announcements/$id/edit',
)({
  component: AnnouncementFormEdit,
})
