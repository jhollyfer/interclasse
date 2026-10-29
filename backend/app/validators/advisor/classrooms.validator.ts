import { vine, paginationFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * As turmas do conselheiro, com busca pelo nome. Par do Zod de
 * `shared/src/validators/advisor/classrooms.validator.ts`.
 */
export const AdvisorClassroomPaginateValidator = vine.create({
  ...paginationFields(),
})

export type AdvisorClassroomPaginatePayload = Infer<typeof AdvisorClassroomPaginateValidator>
