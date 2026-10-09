import { createLazyFileRoute } from '@tanstack/react-router'
import { ClassroomFormCreate } from './-components/form-create'

export const Route = createLazyFileRoute(
  '/_private/administrator/classrooms/new',
)({
  component: ClassroomFormCreate,
})
