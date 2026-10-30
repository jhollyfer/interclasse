import { CATEGORIES } from '../../enums/category.js'
import { GRADES } from '../../enums/grades.js'
import { paginationFields, sortFields, z } from '../../validator.js'

/**
 * A turma, como o painel a cadastra. Par de caminho e nome do VineJS de
 * `backend/app/validators/administrator/classrooms.validator.ts`
 * (`_standards/architecture.md` §10). A categoria sai do ano e por isso não é
 * campo de entrada; que a conta indicada exista e tenha o papel do vínculo é
 * regra do domínio, não do formulário.
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

/** Campo ausente é "não mexer"; `null` em conselheiro ou representante desfaz o vínculo. */
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
