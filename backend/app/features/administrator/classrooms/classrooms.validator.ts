import { CATEGORIES, GRADES } from '@interclasse/shared'

import { vine, notNull, paginationFields, sortFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const CLASSROOM_SORT_COLUMNS = ['name', 'grade', 'category', 'createdAt'] as const

/** O ano da turma. A categoria sai dele, e por isso ela não é campo de entrada. */
export function grade() {
  return vine.number().withoutDecimals().min(GRADES.MIN).max(GRADES.MAX)
}

/**
 * O que `POST /administrator/classrooms` recebe.
 *
 * Conselheiro e representante são opcionais: a turma nasce antes de alguém ser
 * indicado. Que a conta exista e tenha o papel certo é checado no use-case.
 */
export const ClassroomCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(20),
  grade: grade(),
  advisorId: vine.string().uuid().nullable().optional(),
  representativeId: vine.string().uuid().nullable().optional(),
})

/** Campo ausente é "não mexer"; `null` em conselheiro ou representante desfaz o vínculo. */
export const ClassroomUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(20).optional().use(notNull()),
  grade: grade().optional().use(notNull()),
  advisorId: vine.string().uuid().nullable().optional(),
  representativeId: vine.string().uuid().nullable().optional(),
})

export const ClassroomPaginateValidator = vine.create({
  ...paginationFields(),
  ...sortFields(CLASSROOM_SORT_COLUMNS),
  category: vine.enum(CATEGORIES).optional(),
})

export type ClassroomCreatePayload = Infer<typeof ClassroomCreateValidator>

export type ClassroomUpdatePayload = Infer<typeof ClassroomUpdateValidator>

export type ClassroomPaginatePayload = Infer<typeof ClassroomPaginateValidator>
