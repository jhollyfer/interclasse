import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

/** Os cartões de uma turma do conselheiro. */
export const CardPaginateValidator = vine.create({
  ...pageFields(),
  classroomId: vine.string().uuid(),
})

export type CardPaginatePayload = Infer<typeof CardPaginateValidator>
