import { vine, athleteListFields } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

export const EnrollmentUpdateValidator = vine.create({
  classroomId: vine.string().uuid(),
  ...athleteListFields(),
  /** O motivo, quando a lista nova tira alguém da atual. */
  reason: vine.string().trim().minLength(5).maxLength(500).optional(),
})

export type EnrollmentUpdatePayload = Readonly<
  Infer<typeof EnrollmentUpdateValidator>
>
