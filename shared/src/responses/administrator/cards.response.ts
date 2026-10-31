import {
  AdministratorMatchTeamResponse,
  AdministratorMatchUpdateResponse,
} from './matches.response.js'
import { CARD_COLORS } from '../../enums/card-color.js'
import { z } from '../../validator.js'

/**
 * The card as the screens read it: with the athlete, the team they played for and the
 * match (`_standards/architecture.md` §10).
 */
export const AdministratorCardPaginateResponse = z.object({
  id: z.uuid(),
  matchId: z.uuid(),
  teamId: z.uuid(),
  studentId: z.uuid(),
  color: z.enum(CARD_COLORS),
  note: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
  student: z.object({
    id: z.uuid(),
    classroomId: z.uuid(),
    name: z.string(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }).nullable(),
  }),
  team: AdministratorMatchTeamResponse,
  match: AdministratorMatchUpdateResponse,
})

/** The entered card comes back read from the database, as the list shows it. */
export const AdministratorCardCreateResponse = AdministratorCardPaginateResponse

export type AdministratorCardPaginateResponse = z.infer<
  typeof AdministratorCardPaginateResponse
>

export type AdministratorCardCreateResponse = z.infer<
  typeof AdministratorCardCreateResponse
>
