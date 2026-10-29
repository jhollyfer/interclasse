import { vine, paginationFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const StudentPaginateValidator = vine.create({
  ...paginationFields(),
  classroomId: vine.string().uuid().optional(),
})

export const StudentCreateValidator = vine.create({
  classroomId: vine.string().uuid(),
  name: vine.string().trim().minLength(1).maxLength(120),
})

/** Só o nome: trocar o aluno de turma é apagar e cadastrar na outra. */
export const StudentUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
})

export type StudentPaginatePayload = Infer<typeof StudentPaginateValidator>

export type StudentCreatePayload = Infer<typeof StudentCreateValidator>

export type StudentUpdatePayload = Infer<typeof StudentUpdateValidator>
