import { vine, athleteListFields } from '#core/validator'
import type { Infer } from '#core/validator'

/** No `classroomId`: the representative's classroom comes from the session, never from the payload. */
export const RepresentativeEnrollmentUpdateValidator = vine.create({
  ...athleteListFields(),
})

export type RepresentativeEnrollmentUpdatePayload = Infer<
  typeof RepresentativeEnrollmentUpdateValidator
>
