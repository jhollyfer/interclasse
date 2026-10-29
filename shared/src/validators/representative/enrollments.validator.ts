import { athleteListFields, z } from '../../validator.js'

/**
 * Sem `classroomId`: a turma do representante sai da sessão, nunca do payload.
 * Par do VineJS de `backend/app/validators/representative/enrollments.validator.ts`.
 */
export const RepresentativeEnrollmentUpdateValidator = z.object({
  ...athleteListFields(),
})

export type RepresentativeEnrollmentUpdatePayload = z.infer<
  typeof RepresentativeEnrollmentUpdateValidator
>
