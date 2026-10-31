import { vine, paginationFields } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * The advisor's classrooms, with search by name. Mirror of the Zod one in
 * `shared/src/validators/advisor/classrooms.validator.ts`.
 */
export const AdvisorClassroomPaginateValidator = vine.create({
  ...paginationFields(),
})

export type AdvisorClassroomPaginatePayload = Infer<typeof AdvisorClassroomPaginateValidator>
