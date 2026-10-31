import { RepresentativeEnrollmentShowResponse } from '@interclasse/shared'
import { queryOptions } from '@tanstack/react-query'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'

import { request } from '../http'

/** The representative's classroom matrix. The classroom comes from the session: `null` key. */
export const representativeEnrollmentsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.representative.enrollments.board,
    queryFn: ({ signal }) =>
      request(
        '/representative/enrollments',
        RepresentativeEnrollmentShowResponse,
        { signal },
      ),
    retry: false,
  })
