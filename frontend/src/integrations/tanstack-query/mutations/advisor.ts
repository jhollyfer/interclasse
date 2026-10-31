import {
  AdvisorEnrollmentShowResponse,
  AdvisorStudentShowResponse,
} from '@interclasse/shared'
import type {
  AdvisorEnrollmentUpdatePayload,
  AdvisorStudentCreatePayload,
  AdvisorStudentUpdatePayload,
  Merge,
} from '@interclasse/shared'
import { useMutation } from '@tanstack/react-query'

import type { MutationProps } from '#/hooks/tanstack-query/_mutation-props'

import type { HTTPError } from '../http'
import { request, send } from '../http'

export function useStudentCreateMutation(
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
      return request('/advisor/students', AdvisorStudentShowResponse, {
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

export function useStudentUpdateMutation(
  options?: MutationProps<AdvisorStudentShowResponse, StudentUpdateVariables>,
) {
  return useMutation<
    AdvisorStudentShowResponse,
    HTTPError,
    StudentUpdateVariables
  >({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request(
        '/advisor/students/'.concat(id),
        AdvisorStudentShowResponse,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      )
    },
  })
}

export function useStudentDeleteMutation(
  options?: MutationProps<void, string>,
) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/advisor/students/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

/** Replaces the classroom's athlete list for a sport, in full. */
export function useAdvisorEnrollmentUpdateMutation(
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
      return request('/advisor/enrollments', AdvisorEnrollmentShowResponse, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
  })
}
