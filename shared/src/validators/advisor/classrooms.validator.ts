import { paginationFields, z } from '../../validator.js'

/**
 * The advisor's classrooms, with search by name. Mirror of the VineJS one in
 * `backend/app/validators/advisor/classrooms.validator.ts`.
 */
export const AdvisorClassroomPaginateValidator = z.object({
  ...paginationFields(),
})

export type AdvisorClassroomPaginatePayload = z.infer<
  typeof AdvisorClassroomPaginateValidator
>
