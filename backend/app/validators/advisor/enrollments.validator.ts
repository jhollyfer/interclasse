import { vine, athleteListFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const AdvisorEnrollmentShowValidator = vine.create({
  classroomId: vine.string().uuid(),
})

export const AdvisorEnrollmentUpdateValidator = vine.create({
  classroomId: vine.string().uuid(),
  ...athleteListFields(),
  /** The reason, when the new list removes someone from the current one. */
  reason: vine.string().trim().minLength(5).maxLength(500).optional(),
})

export type AdvisorEnrollmentShowPayload = Infer<typeof AdvisorEnrollmentShowValidator>

export type AdvisorEnrollmentUpdatePayload = Infer<typeof AdvisorEnrollmentUpdateValidator>
