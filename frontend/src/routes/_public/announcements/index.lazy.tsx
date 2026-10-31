import { createLazyFileRoute } from '@tanstack/react-router'

import { AnnouncementsPage } from './-components/announcements-page'

export const Route = createLazyFileRoute('/_public/announcements/')({
  component: AnnouncementsPage,
})
