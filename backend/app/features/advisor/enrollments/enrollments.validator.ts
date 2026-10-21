import { vine, athleteListFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const EnrollmentShowValidator = vine.create({
  classroomId: vine.string().uuid(),
})

export const EnrollmentUpdateValidator = vine.create({
  classroomId: vine.string().uuid(),
  ...athleteListFields(),
  /** O motivo, quando a lista nova tira alguém da atual. */
  reason: vine.string().trim().minLength(5).maxLength(500).optional(),
})

export type EnrollmentShowPayload = Infer<typeof EnrollmentShowValidator>

export type EnrollmentUpdatePayload = Infer<typeof EnrollmentUpdateValidator>
