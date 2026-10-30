import { useMutation } from '@tanstack/react-query'
import type {
  RepresentativeEnrollmentUpdatePayload,
  RepresentativeEnrollmentShowResponse,
} from '@interclasse/shared'

import type { HTTPError } from '../http'
import { request } from '../http'
import type { MutationProps } from '../mutation-props'

/** A mesma troca, na turma do representante - que sai da sessão. */
export function useRepresentativeEnrollmentUpdate(
  options?: MutationProps<
    RepresentativeEnrollmentShowResponse,
    RepresentativeEnrollmentUpdatePayload
  >,
) {
  return useMutation<
    RepresentativeEnrollmentShowResponse,
    HTTPError,
    RepresentativeEnrollmentUpdatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request<RepresentativeEnrollmentShowResponse>(
        '/representative/enrollments',
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
      )
    },
  })
}
