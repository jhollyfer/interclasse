import { vine, athleteListFields } from '#core/validator'
import type { Infer } from '#core/validator'

/** Sem `classroomId`: a turma do representante sai da sessão, nunca do payload. */
export const RepresentativeEnrollmentUpdateValidator = vine.create({
  ...athleteListFields(),
})

export type RepresentativeEnrollmentUpdatePayload = Infer<
  typeof RepresentativeEnrollmentUpdateValidator
>
