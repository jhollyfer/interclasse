import { vine, athleteListFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const AdvisorEnrollmentShowValidator = vine.create({
  classroomId: vine.string().uuid(),
})

export const AdvisorEnrollmentUpdateValidator = vine.create({
  classroomId: vine.string().uuid(),
  ...athleteListFields(),
  /** O motivo, quando a lista nova tira alguém da atual. */
  reason: vine.string().trim().minLength(5).maxLength(500).optional(),
})

export type AdvisorEnrollmentShowPayload = Infer<typeof AdvisorEnrollmentShowValidator>

export type AdvisorEnrollmentUpdatePayload = Infer<typeof AdvisorEnrollmentUpdateValidator>
