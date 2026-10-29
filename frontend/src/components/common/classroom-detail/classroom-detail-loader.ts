import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'

import { HTTPError, HTTPStatus } from '#/integrations/tanstack-query/http'
import {
  advisorClassroomsQueryOptions,
  advisorEnrollmentsQueryOptions,
  studentsQueryOptions,
} from '#/integrations/tanstack-query/queries'

/** A lista de alunos inteira: uma turma não passa de 40. */
export function studentsOf(classroomId: string) {
  return { classroomId, perPage: 100 }
}

/**
 * As turmas visíveis a quem está no painel, para o quadro lateral do detalhe:
 * o conselheiro vê a dele, o administrador todas. A escola tem 24.
 */
export const VISIBLE_CLASSROOMS = { perPage: 100 }

/**
 * O que o detalhe da turma lê antes de desenhar, igual no administrador e no
 * conselheiro. Turma alheia também é 404: o servidor não confirma que ela
 * existe.
 */
export async function loadClassroomDetail(
  queryClient: QueryClient,
  classroomId: string,
): Promise<void> {
  try {
    await Promise.all([
      queryClient.query({
        ...advisorEnrollmentsQueryOptions(classroomId),
        staleTime: 'static',
      }),
      queryClient.query({
        ...studentsQueryOptions(studentsOf(classroomId)),
        staleTime: 'static',
      }),
      queryClient.query(advisorClassroomsQueryOptions(VISIBLE_CLASSROOMS)),
    ])
  } catch (error) {
    if (error instanceof HTTPError && error.status === HTTPStatus.NOT_FOUND) {
      throw notFound()
    }

    throw error
  }
}
