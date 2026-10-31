import { CARD_COLORS } from '../../enums/card-color.js'
import { pageFields, z } from '../../validator.js'

export const AdministratorCardPaginateValidator = z.object({
  ...pageFields(),
  matchId: z.uuid().optional(),
  classroomId: z.uuid().optional(),
  studentId: z.uuid().optional(),
})

/** The card: in which match, for which athlete, and the color. The team comes from the athlete. */
export const AdministratorCardCreateValidator = z.object({
  matchId: z.uuid(),
  studentId: z.uuid(),
  color: z.enum(CARD_COLORS),
  note: z.string().trim().max(200).nullable().optional(),
})

export type AdministratorCardPaginatePayload = z.infer<
  typeof AdministratorCardPaginateValidator
>

export type AdministratorCardCreatePayload = z.infer<
  typeof AdministratorCardCreateValidator
>
