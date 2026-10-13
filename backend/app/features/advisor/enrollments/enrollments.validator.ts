import { vine, athleteListFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const AdvisorEnrollmentShowValidator = vine.create({
  classroomId: vine.string().uuid(),
})

export const AdvisorEnrollmentUpdateValidator = vine.create({
  classroomId: vine.string().uuid(),
  ...athleteListFields(),
})

export type AdvisorEnrollmentShowPayload = Infer<typeof AdvisorEnrollmentShowValidator>

export type AdvisorEnrollmentUpdatePayload = Infer<typeof AdvisorEnrollmentUpdateValidator>
