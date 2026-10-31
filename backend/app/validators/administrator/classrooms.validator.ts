import { CATEGORIES, GRADES } from '@interclasse/shared'

import { vine, notNull, paginationFields, sortFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const CLASSROOM_SORT_COLUMNS = ['name', 'grade', 'category', 'createdAt'] as const

/** The classroom grade. The category comes from it, which is why it is not an input field. */
export function grade() {
  return vine.number().withoutDecimals().min(GRADES.MIN).max(GRADES.MAX)
}

/**
 * What `POST /administrator/classrooms` receives.
 *
 * Advisor and representative are optional: the classroom is born before anyone is
 * named. That the account exists and has the right role is checked in the use case.
 */
export const AdministratorClassroomCreateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(20),
  grade: grade(),
  advisorId: vine.string().uuid().nullable().optional(),
  representativeId: vine.string().uuid().nullable().optional(),
})

/** An absent field means "leave alone"; `null` on advisor or representative undoes the link. */
export const AdministratorClassroomUpdateValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(20).optional().use(notNull()),
  grade: grade().optional().use(notNull()),
  advisorId: vine.string().uuid().nullable().optional(),
  representativeId: vine.string().uuid().nullable().optional(),
})

export const AdministratorClassroomPaginateValidator = vine.create({
  ...paginationFields(),
  ...sortFields(CLASSROOM_SORT_COLUMNS),
  category: vine.enum(CATEGORIES).optional(),
})

export type AdministratorClassroomCreatePayload = Infer<
  typeof AdministratorClassroomCreateValidator
>

export type AdministratorClassroomUpdatePayload = Infer<
  typeof AdministratorClassroomUpdateValidator
>

export type AdministratorClassroomPaginatePayload = Infer<
  typeof AdministratorClassroomPaginateValidator
>
