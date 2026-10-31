import { AdministratorBracketPaginateResponse } from './brackets.response.js'
import { CATEGORIES } from '../../enums/category.js'
import { MATCH_PHASES } from '../../enums/match-phase.js'
import { MATCH_STATUSES } from '../../enums/match-status.js'
import { z } from '../../validator.js'

/**
 * The match as the API returns it (`_standards/architecture.md` §10). The match table
 * shows only what the storefront may see of the classroom; the match the panel has just
 * changed carries the whole classroom.
 */
const iso = () => z.iso.datetime({ offset: true })

/** The classroom as the match table shows it: without advisor or representative. */
const publicClassroom = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.enum(CATEGORIES),
})

const fullClassroom = z.object({
  id: z.uuid(),
  name: z.string(),
  grade: z.number().int(),
  category: z.enum(CATEGORIES),
  advisorId: z.uuid().nullable(),
  representativeId: z.uuid().nullable(),
  createdAt: iso(),
  updatedAt: iso().nullable(),
})

/** The team is the classroom inside the competition: the scoreboard name comes from the classroom. */
function teamOf<TClassroom extends z.ZodType>(classroom: TClassroom) {
  return z.object({
    id: z.uuid(),
    bracketId: z.uuid(),
    classroomId: z.uuid(),
    createdAt: iso(),
    updatedAt: iso().nullable(),
    classroom,
  })
}

const matchFields = {
  id: z.uuid(),
  bracketId: z.uuid(),
  phase: z.enum(MATCH_PHASES),
  round: z.number().int(),
  position: z.number().int(),
  status: z.enum(MATCH_STATUSES),
  homeTeamId: z.uuid().nullable(),
  awayTeamId: z.uuid().nullable(),
  homeScore: z.number().int().nullable(),
  awayScore: z.number().int().nullable(),
  winnerTeamId: z.uuid().nullable(),
  scheduledAt: iso().nullable(),
  location: z.string().nullable(),
  createdAt: iso(),
  updatedAt: iso().nullable(),
}

/** The team with the whole classroom: the card and the changed match reuse it. */
export const AdministratorMatchTeamResponse = teamOf(fullClassroom)

/** The match table: both teams already defined, the classroom with only what is public. */
export const AdministratorMatchPaginateResponse = z.object({
  ...matchFields,
  homeTeam: teamOf(publicClassroom),
  awayTeam: teamOf(publicClassroom),
  bracket: AdministratorBracketPaginateResponse,
})

/** The scheduled match or one with a score: a team may still be missing. */
export const AdministratorMatchUpdateResponse = z.object({
  ...matchFields,
  homeTeam: AdministratorMatchTeamResponse.nullable(),
  awayTeam: AdministratorMatchTeamResponse.nullable(),
  bracket: AdministratorBracketPaginateResponse,
})

export const AdministratorMatchScoreResponse = AdministratorMatchUpdateResponse

export const AdministratorMatchUnscoreResponse =
  AdministratorMatchUpdateResponse

/**
 * The athletes who can receive a card in a match: the students of both classrooms,
 * with those enrolled in the sport marked - they are the ones who take the court.
 */
export const AdministratorMatchAthletesResponse = z.object({
  teams: z.array(
    z.object({
      teamId: z.uuid(),
      classroomId: z.uuid(),
      name: z.string(),
      students: z.array(
        z.object({ id: z.uuid(), name: z.string(), enrolled: z.boolean() }),
      ),
    }),
  ),
})

export type AdministratorMatchTeamResponse = z.infer<
  typeof AdministratorMatchTeamResponse
>

export type AdministratorMatchPaginateResponse = z.infer<
  typeof AdministratorMatchPaginateResponse
>

export type AdministratorMatchUpdateResponse = z.infer<
  typeof AdministratorMatchUpdateResponse
>

export type AdministratorMatchScoreResponse = z.infer<
  typeof AdministratorMatchScoreResponse
>

export type AdministratorMatchUnscoreResponse = z.infer<
  typeof AdministratorMatchUnscoreResponse
>

export type AdministratorMatchAthletesResponse = z.infer<
  typeof AdministratorMatchAthletesResponse
>
