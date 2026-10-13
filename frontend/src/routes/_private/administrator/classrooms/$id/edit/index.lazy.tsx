import { createLazyFileRoute } from '@tanstack/react-router'

import { ClassroomFormEdit } from '../../-components/form-edit'

export const Route = createLazyFileRoute(
  '/_private/administrator/classrooms/$id/edit/',
)({
  component: ClassroomFormEdit,
})
