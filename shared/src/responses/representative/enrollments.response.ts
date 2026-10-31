import type { z } from '../../validator.js'
import { AdvisorEnrollmentShowResponse } from '../advisor/enrollments.response.js'

/** The matrix of the representative's classroom: the same shape as the advisor's. */
export const RepresentativeEnrollmentShowResponse =
  AdvisorEnrollmentShowResponse

export type RepresentativeEnrollmentShowResponse = z.infer<
  typeof RepresentativeEnrollmentShowResponse
>
