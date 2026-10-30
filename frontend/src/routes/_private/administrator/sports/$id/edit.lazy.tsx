import { createLazyFileRoute } from '@tanstack/react-router'

import { SportFormEdit } from '../-components/form-edit'

export const Route = createLazyFileRoute(
  '/_private/administrator/sports/$id/edit',
)({
  component: SportFormEdit,
})
