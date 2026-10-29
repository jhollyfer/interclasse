import { pageFields, z } from '../../validator.js'

/** Os cartões de uma turma do conselheiro. */
export const AdvisorCardPaginateValidator = z.object({
  ...pageFields(),
  classroomId: z.uuid(),
})

export type AdvisorCardPaginatePayload = z.infer<typeof AdvisorCardPaginateValidator>
