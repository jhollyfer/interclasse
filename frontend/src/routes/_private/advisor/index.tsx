import { createFileRoute, redirect } from '@tanstack/react-router'

import { VISIBLE_CLASSROOMS } from '#/components/common/classroom-detail'
import { advisorClassroomsQueryOptions } from '#/integrations/tanstack-query/queries/advisor'

/**
 * The advisor has a single classroom (unique index on `classrooms.advisor_id`):
 * the area's entry leads straight to it. Without a classroom, this route's notice remains.
 */
export const Route = createFileRoute('/_private/advisor/')({
  loader: async ({ context }) => {
    const classrooms = await context.queryClient.query(
      advisorClassroomsQueryOptions(VISIBLE_CLASSROOMS),
    )
    const [classroom] = classrooms.data

    if (classroom)
      throw redirect({
        to: '/advisor/$classroomId',
        params: { classroomId: classroom.id },
        replace: true,
      })
  },
})
