import { RepresentativeEnrollmentShowResponse } from '@interclasse/shared'
import type { RepresentativeEnrollmentUpdatePayload } from '@interclasse/shared'
import { useMutation } from '@tanstack/react-query'

import type { MutationProps } from '#/hooks/tanstack-query/_mutation-props'

import type { HTTPError } from '../http'
import { request } from '../http'

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
