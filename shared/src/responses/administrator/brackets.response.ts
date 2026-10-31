import { AdministratorSportShowResponse } from './sports.response.js'
import { BRACKET_STATUSES } from '../../enums/bracket-status.js'
import { CATEGORIES } from '../../enums/category.js'
import { MATCH_PHASES } from '../../enums/match-phase.js'
import { MATCH_STATUSES } from '../../enums/match-status.js'
import { z } from '../../validator.js'

/**
 * The bracket as the API returns it (`_standards/architecture.md` §10). Dates in
 * ISO 8601, the transport type.
 */

/** The bracket with its sport: the listing, the draw and the match that nests it. */
export const AdministratorBracketPaginateResponse = z.object({
  id: z.uuid(),
  sportId: z.uuid(),
  category: z.enum(CATEGORIES),
  status: z.enum(BRACKET_STATUSES),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
  sport: AdministratorSportShowResponse,
})

/** The draw returns the bracket of the list; when repeated, the one that already existed. */
export const AdministratorBracketCreateResponse =
  AdministratorBracketPaginateResponse

/**
 * The whole competition in one response: all matches, of every phase, with the
 * classroom names already resolved. It is the bracket screen of the panel and the site.
 */
export const AdministratorBracketShowResponse = z.object({
  id: z.uuid(),
  category: z.enum(CATEGORIES),
  status: z.enum(BRACKET_STATUSES),
  sport: z.object({ id: z.uuid(), name: z.string(), slug: z.string() }),
  /** Null until the bracket finishes. */
  championTeamId: z.uuid().nullable(),
  matches: z.array(
    z.object({
      id: z.uuid(),
      phase: z.enum(MATCH_PHASES),
      round: z.number().int(),
      position: z.number().int(),
      status: z.enum(MATCH_STATUSES),
      homeTeamId: z.uuid().nullable(),
      awayTeamId: z.uuid().nullable(),
      homeName: z.string().nullable(),
      awayName: z.string().nullable(),
      homeScore: z.number().int().nullable(),
      awayScore: z.number().int().nullable(),
      winnerTeamId: z.uuid().nullable(),
      scheduledAt: z.iso.datetime({ offset: true }).nullable(),
      location: z.string().nullable(),
    }),
  ),
})

/**
 * What the draw would do now: each classroom of the category with how many athletes it
 * has enrolled in the sport, and whether it enters. It is what the dialog shows before
 * drawing, so a left-out classroom is no surprise.
 */
export const AdministratorBracketPreviewResponse = z.object({
  minAthletes: z.number().int(),
  maxTeams: z.number().int(),
  /** A bracket for this sport already exists in this category. */
  drawn: z.boolean(),
  classrooms: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      athletes: z.number().int(),
      eligible: z.boolean(),
    }),
  ),
})

export type AdministratorBracketPaginateResponse = z.infer<
  typeof AdministratorBracketPaginateResponse
>

export type AdministratorBracketCreateResponse = z.infer<
  typeof AdministratorBracketCreateResponse
>

export type AdministratorBracketShowResponse = z.infer<
  typeof AdministratorBracketShowResponse
>

export type AdministratorBracketPreviewResponse = z.infer<
  typeof AdministratorBracketPreviewResponse
>
