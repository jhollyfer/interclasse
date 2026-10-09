import { createFileRoute, notFound } from '@tanstack/react-router'

import { HTTPError, HTTPStatus } from '#/integrations/tanstack-query/http'
import {
  advisorEnrollmentsQueryOptions,
  studentsQueryOptions,
} from '#/integrations/tanstack-query/queries'

/** A lista de alunos inteira: uma turma não passa de 40. */
export function studentsOf(classroomId: string) {
  return { classroomId, perPage: 100 }
}

export const Route = createFileRoute('/_private/advisor/$classroomId/')({
  loader: async ({ context, params }) => {
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(
          advisorEnrollmentsQueryOptions(params.classroomId),
        ),
        context.queryClient.ensureQueryData(
          studentsQueryOptions(studentsOf(params.classroomId)),
        ),
      ])
    } catch (error) {
      // Turma alheia também é 404: o servidor não confirma que ela existe.
      if (error instanceof HTTPError && error.status === HTTPStatus.NOT_FOUND) {
        throw notFound()
      }

      throw error
    }
  },
})
