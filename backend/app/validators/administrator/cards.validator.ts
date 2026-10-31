import { CARD_COLORS } from '@interclasse/shared'

import { vine, pageFields } from '#core/validator'
import type { Infer } from '#core/validator'

export const AdministratorCardPaginateValidator = vine.create({
  ...pageFields(),
  matchId: vine.string().uuid().optional(),
  classroomId: vine.string().uuid().optional(),
  studentId: vine.string().uuid().optional(),
})

/** The card: in which match, for which athlete, and the color. The team comes from the athlete. */
export const AdministratorCardCreateValidator = vine.create({
  matchId: vine.string().uuid(),
  studentId: vine.string().uuid(),
  color: vine.enum(CARD_COLORS),
  note: vine.string().trim().maxLength(200).nullable().optional(),
})

export type AdministratorCardPaginatePayload = Infer<typeof AdministratorCardPaginateValidator>

export type AdministratorCardCreatePayload = Infer<typeof AdministratorCardCreateValidator>
