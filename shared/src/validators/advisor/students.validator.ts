import { paginationFields, z } from '../../validator.js'

/**
 * Os alunos de uma turma do conselheiro. Par do VineJS de
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

/** Só o nome: trocar o aluno de turma é apagar e cadastrar na outra. */
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
