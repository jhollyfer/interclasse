import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

/** The cards of an advisor's classroom. */
export const AdvisorCardPaginateValidator = vine.create({
  ...pageFields(),
  classroomId: vine.string().uuid(),
})

export type AdvisorCardPaginatePayload = Infer<typeof AdvisorCardPaginateValidator>
