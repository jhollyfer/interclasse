import { useMutation } from '@tanstack/react-query'

import type { IEnrollmentBoard } from '#/lib/interfaces'
import type { EnrollmentUpdatePayload as RepresentativeEnrollmentUpdatePayload } from '#/validators/representative/enrollments.validator'

import type { HTTPError } from '../http'
import { request } from '../http'
import type { MutationProps } from '../mutation-props'

/** A mesma troca, na turma do representante - que sai da sessão. */
export function useRepresentativeEnrollmentUpdate(
  options?: MutationProps<
    IEnrollmentBoard,
    RepresentativeEnrollmentUpdatePayload
  >,
) {
  return useMutation<
    IEnrollmentBoard,
    HTTPError,
    RepresentativeEnrollmentUpdatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request<IEnrollmentBoard>('/representative/enrollments', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
  })
}
