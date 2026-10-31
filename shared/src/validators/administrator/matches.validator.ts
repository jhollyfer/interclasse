import { CATEGORIES } from '../../enums/category.js'
import { MATCH_PHASES } from '../../enums/match-phase.js'
import { MATCH_STATUSES } from '../../enums/match-status.js'
import { pageFields, z } from '../../validator.js'

/**
 * The match table filters, the same in the panel and on the site. Mirror (path and
 * name) of the VineJS one in `backend/app/validators/administrator/matches.validator.ts`.
 */
export function matchFilterFields() {
  return {
    bracketId: z.uuid().optional(),
    // A classroom's matches: the "Matches" tab of the classroom detail.
    classroomId: z.uuid().optional(),
    sportId: z.uuid().optional(),
    category: z.enum(CATEGORIES).optional(),
    phase: z.enum(MATCH_PHASES).optional(),
    status: z.enum(MATCH_STATUSES).optional(),
  }
}

export const AdministratorMatchPaginateValidator = z.object({
  ...pageFields(),
  ...matchFilterFields(),
})

/** The match schedule: ISO 8601 with offset, `null` unschedules, absent leaves it alone. */
export const AdministratorMatchUpdateValidator = z.object({
  scheduledAt: z.iso.datetime({ offset: true }).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
})

/**
 * The score. `winnerTeamId` is only read in a tied knockout - the winner on
 * penalties; in any other case the score decides on its own.
 */
export const AdministratorMatchScoreValidator = z.object({
  homeScore: z.number().int().min(0).max(999),
  awayScore: z.number().int().min(0).max(999),
  winnerTeamId: z.uuid().optional(),
})

export type AdministratorMatchPaginatePayload = z.infer<
  typeof AdministratorMatchPaginateValidator
>

export type AdministratorMatchUpdatePayload = z.infer<
  typeof AdministratorMatchUpdateValidator
>

export type AdministratorMatchScorePayload = z.infer<
  typeof AdministratorMatchScoreValidator
>
