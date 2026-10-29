import { vine, paginationFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const AdvisorStudentPaginateValidator = vine.create({
  ...paginationFields(),
  classroomId: vine.string().uuid().optional(),
})

export const AdvisorStudentCreateValidator = vine.create({
  classroomId: vine.string().uuid(),
  name: vine.string().trim().minLength(1).maxLength(120),
})

/** Só o nome: trocar o aluno de turma é apagar e cadastrar na outra. */
export const AdvisorStudentUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
})

export type AdvisorStudentPaginatePayload = Infer<typeof AdvisorStudentPaginateValidator>

export type AdvisorStudentCreatePayload = Infer<typeof AdvisorStudentCreateValidator>

export type AdvisorStudentUpdatePayload = Infer<typeof AdvisorStudentUpdateValidator>
