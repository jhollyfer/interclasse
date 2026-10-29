import { paginationFields, z } from '../../validator.js'

/**
 * As turmas do conselheiro, com busca pelo nome. Par do VineJS de
 * `backend/app/validators/advisor/classrooms.validator.ts`.
 */
export const AdvisorClassroomPaginateValidator = z.object({
  ...paginationFields(),
})

export type AdvisorClassroomPaginatePayload = z.infer<typeof AdvisorClassroomPaginateValidator>
