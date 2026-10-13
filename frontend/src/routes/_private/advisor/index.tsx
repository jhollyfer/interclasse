import { createFileRoute } from '@tanstack/react-router'

import { advisorClassroomsQueryOptions } from '#/integrations/tanstack-query/queries'

/** Todas as turmas de uma vez: um conselheiro tem poucas, a escola tem 24. */
export const ADVISOR_CLASSROOMS = { perPage: 100 }

export const Route = createFileRoute('/_private/advisor/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      advisorClassroomsQueryOptions(ADVISOR_CLASSROOMS),
    ),
})
