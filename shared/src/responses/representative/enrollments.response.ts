import type { z } from '../../validator.js'
import { AdvisorEnrollmentShowResponse } from '../advisor/enrollments.response.js'

/** A matriz da turma do representante: a mesma forma da do conselheiro. */
export const RepresentativeEnrollmentShowResponse =
  AdvisorEnrollmentShowResponse

export type RepresentativeEnrollmentShowResponse = z.infer<
  typeof RepresentativeEnrollmentShowResponse
>
