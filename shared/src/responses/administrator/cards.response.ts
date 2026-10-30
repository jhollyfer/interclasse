import {
  AdministratorMatchTeamResponse,
  AdministratorMatchUpdateResponse,
} from './matches.response.js'
import { CARD_COLORS } from '../../enums/card-color.js'
import { z } from '../../validator.js'

/**
 * O cartão como as telas o leem: com o atleta, o time por que jogava e a
 * partida (`_standards/architecture.md` §10).
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

/** O cartão lançado volta lido do banco, como a lista o mostra. */
export const AdministratorCardCreateResponse = AdministratorCardPaginateResponse

export type AdministratorCardPaginateResponse = z.infer<
  typeof AdministratorCardPaginateResponse
>

export type AdministratorCardCreateResponse = z.infer<
  typeof AdministratorCardCreateResponse
>
