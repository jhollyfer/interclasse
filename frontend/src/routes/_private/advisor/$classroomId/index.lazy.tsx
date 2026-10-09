import { createLazyFileRoute } from '@tanstack/react-router'
import { ClassroomPage } from '../-components/classroom-page'

export const Route = createLazyFileRoute('/_private/advisor/$classroomId/')({
  component: ClassroomPage,
})
