import { vine } from '#/lib/validator'
import type { Infer } from '#/lib/validator'
import { GRADES } from '#/lib/entity'

export const CLASSROOM_SORT_COLUMNS = [
  'name',
  'grade',
  'category',
  'createdAt',
] as const

export function grade() {
  return vine.number().withoutDecimals().min(GRADES.MIN).max(GRADES.MAX)
}

export const AdministratorClassroomCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(20),
  grade: grade(),
  advisorId: vine.string().uuid().nullable().optional(),
  representativeId: vine.string().uuid().nullable().optional(),
})

export const AdministratorClassroomUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(20).optional(),
  grade: grade().optional(),
  advisorId: vine.string().uuid().nullable().optional(),
  representativeId: vine.string().uuid().nullable().optional(),
})

export type AdministratorClassroomCreatePayload = Infer<
  typeof AdministratorClassroomCreateValidator
>
export type AdministratorClassroomUpdatePayload = Infer<
  typeof AdministratorClassroomUpdateValidator
>
