import { useMutation } from '@tanstack/react-query'

import type { IStudent, IEnrollmentBoard, Merge } from '#/lib/interfaces'
import type { EnrollmentUpdatePayload as AdvisorEnrollmentUpdatePayload } from '#/validators/advisor/enrollments.validator'
import type {
  StudentCreatePayload,
  StudentUpdatePayload,
} from '#/validators/advisor/students.validator'

import type { HTTPError } from '../http'
import { request, send } from '../http'
import type { MutationProps } from '../mutation-props'

export function useStudentCreate(
  options?: MutationProps<IStudent, StudentCreatePayload>,
) {
  return useMutation<IStudent, HTTPError, StudentCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IStudent>('/advisor/students', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export type StudentUpdateVariables = Merge<
  StudentUpdatePayload,
  { readonly id: string }
>

export function useStudentUpdate(
  options?: MutationProps<IStudent, StudentUpdateVariables>,
) {
  return useMutation<IStudent, HTTPError, StudentUpdateVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IStudent>('/advisor/students/'.concat(id), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
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
  options?: MutationProps<IEnrollmentBoard, AdvisorEnrollmentUpdatePayload>,
) {
  return useMutation<
    IEnrollmentBoard,
    HTTPError,
    AdvisorEnrollmentUpdatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request<IEnrollmentBoard>('/advisor/enrollments', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
  })
}
