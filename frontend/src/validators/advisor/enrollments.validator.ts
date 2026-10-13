import { vine, athleteListFields } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

export const EnrollmentUpdateValidator = vine.create({
  classroomId: vine.string().uuid(),
  ...athleteListFields(),
})

export type EnrollmentUpdatePayload = Readonly<
  Infer<typeof EnrollmentUpdateValidator>
>
