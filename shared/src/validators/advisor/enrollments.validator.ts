import { athleteListFields, z } from '../../validator.js'

/**
 * The athlete list of a classroom, as the advisor reads and replaces it. Mirror of
 * the VineJS one in `backend/app/validators/advisor/enrollments.validator.ts`.
 */
export const AdvisorEnrollmentShowValidator = z.object({
  classroomId: z.uuid(),
})

export const AdvisorEnrollmentUpdateValidator = z.object({
  classroomId: z.uuid(),
  ...athleteListFields(),
  /** The reason, when the new list removes someone from the current one. */
  reason: z.string().trim().min(5).max(500).optional(),
})

export type AdvisorEnrollmentShowPayload = z.infer<
  typeof AdvisorEnrollmentShowValidator
>

export type AdvisorEnrollmentUpdatePayload = z.infer<
  typeof AdvisorEnrollmentUpdateValidator
>
