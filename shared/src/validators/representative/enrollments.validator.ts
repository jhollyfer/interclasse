import { athleteListFields, z } from '../../validator.js'

/**
 * No `classroomId`: the representative's classroom comes from the session, never from the payload.
 * Mirror of the VineJS one in `backend/app/validators/representative/enrollments.validator.ts`.
 */
export const RepresentativeEnrollmentUpdateValidator = z.object({
  ...athleteListFields(),
})

export type RepresentativeEnrollmentUpdatePayload = z.infer<
  typeof RepresentativeEnrollmentUpdateValidator
>
