import { vine, athleteListFields } from '#/lib/validator'
import type { Infer } from '#/lib/validator'

export const RepresentativeEnrollmentUpdateValidator = vine.create({
  ...athleteListFields(),
})

export type RepresentativeEnrollmentUpdatePayload = Infer<
  typeof RepresentativeEnrollmentUpdateValidator
>
