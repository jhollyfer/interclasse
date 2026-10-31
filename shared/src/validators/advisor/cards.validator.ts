import { pageFields, z } from '../../validator.js'

/** The cards of an advisor's classroom. */
export const AdvisorCardPaginateValidator = z.object({
  ...pageFields(),
  classroomId: z.uuid(),
})

export type AdvisorCardPaginatePayload = z.infer<
  typeof AdvisorCardPaginateValidator
>
