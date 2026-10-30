import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

/** Os cartões de uma turma do conselheiro. */
export const AdvisorCardPaginateValidator = vine.create({
  ...pageFields(),
  classroomId: vine.string().uuid(),
})

export type AdvisorCardPaginatePayload = Infer<typeof AdvisorCardPaginateValidator>
