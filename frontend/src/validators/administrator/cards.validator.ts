import { vine } from '#/lib/validator'
import type { Infer } from '#/lib/validator'
import { CARD_COLORS } from '#/lib/entity'

export const CardCreateValidator = vine.create({
  matchId: vine.string().uuid(),
  studentId: vine.string().uuid(),
  color: vine.enum(CARD_COLORS),
  note: vine.string().trim().maxLength(200).nullable().optional(),
})

export type CardCreatePayload = Readonly<Infer<typeof CardCreateValidator>>
