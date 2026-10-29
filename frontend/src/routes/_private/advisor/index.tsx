import { createFileRoute, redirect } from '@tanstack/react-router'

import { VISIBLE_CLASSROOMS } from '#/components/common/classroom-detail'
import { advisorClassroomsQueryOptions } from '#/integrations/tanstack-query/queries/advisor'

/**
 * O conselheiro tem uma turma só (índice único em `classrooms.advisor_id`):
 * a entrada da área leva direto a ela. Sem turma, fica o aviso desta rota.
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
