import { vine, athleteListFields } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

export const AdvisorEnrollmentUpdateValidator = vine.create({
  classroomId: vine.string().uuid(),
  ...athleteListFields(),
})

export type AdvisorEnrollmentUpdatePayload = Infer<
  typeof AdvisorEnrollmentUpdateValidator
>
