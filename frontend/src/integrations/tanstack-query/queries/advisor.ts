import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type {
  AdvisorCardPaginateResponse,
  AdvisorClassroomShowResponse,
  AdvisorEnrollmentShowResponse,
  AdvisorPhotoShowResponse,
  AdvisorStudentShowResponse,
  Paginated,
} from '@interclasse/shared'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import type { ListSearch, StudentListSearch } from '#/lib/list-search'
import { queryString } from '#/lib/list-search'
import type { Merge } from '#/lib/merge'

import { request } from '../http'

/** As turmas do conselheiro. O administrador recebe todas. */
export const advisorClassroomsQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.advisor.classrooms.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<AdvisorClassroomShowResponse>>(
        '/advisor/classrooms'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const studentsQueryOptions = (params: StudentListSearch) =>
  queryOptions({
    queryKey: queryKeys.advisor.students.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<AdvisorStudentShowResponse>>(
        '/advisor/students'.concat(queryString(params)),
        {
          signal,
        },
      ),
    placeholderData: keepPreviousData,
  })

/** A matriz aluno x modalidade de uma turma do conselheiro. */
export const advisorCardsQueryOptions = (
  params: Merge<ListSearch, { classroomId: string }>,
) =>
  queryOptions({
    queryKey: queryKeys.advisor.cards.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<AdvisorCardPaginateResponse>>(
        '/advisor/cards'.concat(queryString(params)),
        {
          signal,
        },
      ),
    placeholderData: keepPreviousData,
  })

export const advisorEnrollmentsQueryOptions = (classroomId: string) =>
  queryOptions({
    queryKey: queryKeys.advisor.enrollments.board(classroomId),
    queryFn: ({ signal }) =>
      request<AdvisorEnrollmentShowResponse>(
        '/advisor/enrollments'.concat(queryString({ classroomId })),
        { signal },
      ),
  })

/** As fotos que o conselheiro enviou, com a decisão de cada uma. */
export const advisorPhotosQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.advisor.photos.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<AdvisorPhotoShowResponse>>(
        '/advisor/photos'.concat(queryString(params)),
        {
          signal,
        },
      ),
    placeholderData: keepPreviousData,
  })
