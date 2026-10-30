import { athleteListFields, z } from '../../validator.js'

/**
 * A lista de atletas de uma turma, como o conselheiro a lê e a troca. Par do
 * VineJS de `backend/app/validators/advisor/enrollments.validator.ts`.
 */
export const AdvisorEnrollmentShowValidator = z.object({
  classroomId: z.uuid(),
})

export const AdvisorEnrollmentUpdateValidator = z.object({
  classroomId: z.uuid(),
  ...athleteListFields(),
  /** O motivo, quando a lista nova tira alguém da atual. */
  reason: z.string().trim().min(5).max(500).optional(),
})

export type AdvisorEnrollmentShowPayload = z.infer<
  typeof AdvisorEnrollmentShowValidator
>

export type AdvisorEnrollmentUpdatePayload = z.infer<
  typeof AdvisorEnrollmentUpdateValidator
>
