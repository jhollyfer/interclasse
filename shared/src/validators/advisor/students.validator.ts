import { paginationFields, z } from '../../validator.js'

/**
 * The students of an advisor's classroom. Mirror of the VineJS one in
 * `backend/app/validators/advisor/students.validator.ts`.
 */
const studentName = () => z.string().trim().min(1).max(120)

export const AdvisorStudentPaginateValidator = z.object({
  ...paginationFields(),
  classroomId: z.uuid().optional(),
})

export const AdvisorStudentCreateValidator = z.object({
  classroomId: z.uuid(),
  name: studentName(),
})

/** Name only: moving a student to another classroom is delete and register in the other. */
export const AdvisorStudentUpdateValidator = z.object({
  name: studentName(),
})

export type AdvisorStudentPaginatePayload = z.infer<
  typeof AdvisorStudentPaginateValidator
>

export type AdvisorStudentCreatePayload = z.infer<
  typeof AdvisorStudentCreateValidator
>

export type AdvisorStudentUpdatePayload = z.infer<
  typeof AdvisorStudentUpdateValidator
>
