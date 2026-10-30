import { createLazyFileRoute } from '@tanstack/react-router'

import { SportFormCreate } from './-components/form-create'

export const Route = createLazyFileRoute('/_private/administrator/sports/new')(
  {
    component: SportFormCreate,
  },
)
