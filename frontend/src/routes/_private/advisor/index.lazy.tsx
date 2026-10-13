import { createLazyFileRoute } from '@tanstack/react-router'

import { ClassroomsPage } from './-components/classrooms-page'

export const Route = createLazyFileRoute('/_private/advisor/')({
  component: ClassroomsPage,
})
