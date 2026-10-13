import { createLazyFileRoute } from '@tanstack/react-router'

import { AnnouncementsPage } from './-components/announcements-page'

export const Route = createLazyFileRoute('/_public/avisos/')({
  component: AnnouncementsPage,
})
