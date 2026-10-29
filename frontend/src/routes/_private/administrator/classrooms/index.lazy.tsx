import { createLazyFileRoute } from '@tanstack/react-router'

import { ClassroomGrid } from './-components/classroom-grid'

export const Route = createLazyFileRoute('/_private/administrator/classrooms/')(
  {
    component: ClassroomGrid,
  },
)
