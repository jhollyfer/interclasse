import { queryOptions } from '@tanstack/react-query'
import type { RepresentativeEnrollmentShowResponse } from '@interclasse/shared'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'

import { request } from '../http'

/** A matriz da turma do representante. A turma sai da sessão: chave `null`. */
export const representativeEnrollmentsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.representative.enrollments.board,
    queryFn: ({ signal }) =>
      request<RepresentativeEnrollmentShowResponse>(
        '/representative/enrollments',
        { signal },
      ),
    retry: false,
  })
