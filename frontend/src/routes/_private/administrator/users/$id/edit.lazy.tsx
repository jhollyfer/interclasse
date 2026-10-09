import { createLazyFileRoute } from '@tanstack/react-router'
import { UserFormEdit } from '../-components/form-edit'

export const Route = createLazyFileRoute(
  '/_private/administrator/users/$id/edit',
)({
  component: UserFormEdit,
})
