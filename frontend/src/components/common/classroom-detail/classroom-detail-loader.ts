import type { QueryClient } from '@tanstack/react-query'

import {
  advisorClassroomsQueryOptions,
  advisorEnrollmentsQueryOptions,
  studentsQueryOptions,
} from '#/integrations/tanstack-query/queries/advisor'
import { loadOrNotFound } from '#/lib/load-or-not-found'

/** The whole student list: a classroom never exceeds 40. */
export function studentsOf(classroomId: string) {
  return { classroomId, perPage: 100 }
}

/**
 * The classrooms visible to whoever is on the dashboard, for the detail's side panel:
 * the advisor sees their own, the administrator all. The school has 24.
 */
export const VISIBLE_CLASSROOMS = { perPage: 100 }

/**
 * What the classroom detail reads before drawing, the same for the administrator and
 * the advisor. Someone else's classroom is also a 404: the server does not confirm it
 * exists.
 */
export async function loadClassroomDetail(
  queryClient: QueryClient,
  classroomId: string,
): Promise<void> {
  await loadOrNotFound(() =>
    Promise.all([
      queryClient.query({
        ...advisorEnrollmentsQueryOptions(classroomId),
        staleTime: 'static',
      }),
      queryClient.query({
        ...studentsQueryOptions(studentsOf(classroomId)),
        staleTime: 'static',
      }),
      queryClient.query(advisorClassroomsQueryOptions(VISIBLE_CLASSROOMS)),
    ]),
  )
}
