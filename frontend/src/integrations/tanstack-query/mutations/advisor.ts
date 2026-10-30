import { useMutation } from '@tanstack/react-query'
import type {
  AdvisorEnrollmentUpdatePayload,
  AdvisorStudentCreatePayload,
  AdvisorStudentUpdatePayload,
  AdvisorEnrollmentShowResponse,
  AdvisorStudentShowResponse,
  Merge,
} from '@interclasse/shared'

import type { HTTPError } from '../http'
import { request, send } from '../http'
import type { MutationProps } from '../mutation-props'

export function useStudentCreate(
  options?: MutationProps<
    AdvisorStudentShowResponse,
    AdvisorStudentCreatePayload
  >,
) {
  return useMutation<
    AdvisorStudentShowResponse,
    HTTPError,
    AdvisorStudentCreatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request<AdvisorStudentShowResponse>('/advisor/students', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export type StudentUpdateVariables = Merge<
  AdvisorStudentUpdatePayload,
  { readonly id: string }
>

export function useStudentUpdate(
  options?: MutationProps<AdvisorStudentShowResponse, StudentUpdateVariables>,
) {
  return useMutation<
    AdvisorStudentShowResponse,
    HTTPError,
    StudentUpdateVariables
  >({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<AdvisorStudentShowResponse>(
        '/advisor/students/'.concat(id),
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      )
    },
  })
}

export function useStudentDelete(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/advisor/students/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

/** Troca a lista de atletas da turma numa modalidade, inteira. */
export function useAdvisorEnrollmentUpdate(
  options?: MutationProps<
    AdvisorEnrollmentShowResponse,
    AdvisorEnrollmentUpdatePayload
  >,
) {
  return useMutation<
    AdvisorEnrollmentShowResponse,
    HTTPError,
    AdvisorEnrollmentUpdatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request<AdvisorEnrollmentShowResponse>('/advisor/enrollments', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
  })
}
