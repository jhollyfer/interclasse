import { createLazyFileRoute } from '@tanstack/react-router'

import { ClassroomsTable } from './-components/table'

export const Route = createLazyFileRoute('/_private/administrator/classrooms/')(
  {
    component: ClassroomsTable,
  },
)
