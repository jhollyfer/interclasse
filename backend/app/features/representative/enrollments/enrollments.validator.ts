import { vine, athleteListFields } from '#core/validator'
import type { Infer } from '#core/validator'

/** Sem `classroomId`: a turma do representante sai da sessão, nunca do payload. */
export const EnrollmentUpdateValidator = vine.create({
  ...athleteListFields(),
})

export type EnrollmentUpdatePayload = Infer<typeof EnrollmentUpdateValidator>
