import { vine, athleteListFields } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

export const EnrollmentUpdateValidator = vine.create({
  ...athleteListFields(),
})

export type EnrollmentUpdatePayload = Infer<
  typeof EnrollmentUpdateValidator
>
