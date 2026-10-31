import { CATEGORIES } from '../../enums/category.js'
import { GRADES } from '../../enums/grades.js'
import { paginationFields, sortFields, z } from '../../validator.js'

/**
 * The classroom, as the panel registers it. Mirror (path and name) of the VineJS one in
 * `backend/app/validators/administrator/classrooms.validator.ts`
 * (`_standards/architecture.md` §10). The category comes from the grade, so it is not
 * an input field; that the given account exists and has the link's role is a domain
 * rule, not a form one.
 */
export const CLASSROOM_SORT_COLUMNS = [
  'name',
  'grade',
  'category',
  'createdAt',
] as const

export const AdministratorClassroomCreateValidator = z.object({
  name: z.string().trim().min(1).max(20),
  grade: z.number().int().min(GRADES.MIN).max(GRADES.MAX),
  advisorId: z.uuid().nullable().optional(),
  representativeId: z.uuid().nullable().optional(),
})

/** Absent field means "leave alone"; `null` on advisor or representative undoes the link. */
export const AdministratorClassroomUpdateValidator =
  AdministratorClassroomCreateValidator.partial()

export const AdministratorClassroomPaginateValidator = z.object({
  ...paginationFields(),
  ...sortFields(CLASSROOM_SORT_COLUMNS),
  category: z.enum(CATEGORIES).optional(),
})

export type AdministratorClassroomCreatePayload = z.infer<
  typeof AdministratorClassroomCreateValidator
>

export type AdministratorClassroomUpdatePayload = z.infer<
  typeof AdministratorClassroomUpdateValidator
>

export type AdministratorClassroomPaginatePayload = z.infer<
  typeof AdministratorClassroomPaginateValidator
>
