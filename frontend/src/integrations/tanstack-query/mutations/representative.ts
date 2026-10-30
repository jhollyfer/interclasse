import { useMutation } from '@tanstack/react-query'
import { RepresentativeEnrollmentShowResponse } from '@interclasse/shared'
import type { RepresentativeEnrollmentUpdatePayload } from '@interclasse/shared'

import type { HTTPError } from '../http'
import { request } from '../http'
import type { MutationProps } from '../mutation-props'

/** A mesma troca, na turma do representante - que sai da sessão. */
export function useRepresentativeEnrollmentUpdateMutation(
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
      return request(
        '/representative/enrollments',
        RepresentativeEnrollmentShowResponse,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
      )
    },
  })
}
