import type {
  AdministratorBracketPaginateResponse,
  AdministratorBracketPreviewResponse,
  AdministratorBracketShowResponse,
  AdministratorMatchAthletesResponse,
  AdministratorMatchPaginateResponse,
  AdministratorMatchUpdateResponse,
  AdministratorSportShowResponse,
  BracketStatus,
  Category,
  Either,
  MatchPhase,
  MatchStatus,
  Paginated,
} from '@interclasse/shared'

import type { Bracket } from '#domain/bracket/bracket.entity'
import type { BracketError } from '#domain/bracket/bracket.errors'

/** The order of the bracket list: newest first (panel) or by sport (site tabs). */
export type BracketListOrder = 'newest' | 'sport-name'

export type BracketListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly sportId?: string
  readonly category?: Category
  readonly status?: BracketStatus
  readonly order: BracketListOrder
}

/**
 * The order of the match table: the schedule (scheduled by time, then the
 * unscheduled by round) or, in the site results, the most recent first.
 */
export type MatchListOrder = 'schedule' | 'recent-results'

export type MatchListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly bracketId?: string
  readonly classroomId?: string
  readonly sportId?: string
  readonly category?: Category
  readonly phase?: MatchPhase
  readonly status?: MatchStatus
  readonly order: MatchListOrder
}

/**
 * The bracket persistence, by intent (`_standards/domain.md` §5.1). The
 * single writer of `brackets`, `teams` and `matches`: team and match only change
 * through the root, so they have no repository of their own. It reads sports, classrooms, students and
 * enrollments only to answer what the draw and the screens ask.
 */
export abstract class BracketRepository {
  abstract findById(id: string): Promise<Bracket | null>
  /** The bracket that owns the match. */
  abstract findByMatchId(matchId: string): Promise<Bracket | null>
  /**
   * The bracket that owns the match, with the row locked until the end of the unit of
   * work: two scores at the same time in the same bracket would read the same next
   * match and one would overwrite the other. Only holds inside `UnitOfWork.run`.
   */
  abstract findByMatchIdForUpdate(matchId: string): Promise<Bracket | null>
  abstract findBySportAndCategory(sportId: string, category: Category): Promise<Bracket | null>
  abstract findSport(sportId: string): Promise<AdministratorSportShowResponse | null>
  /**
   * The sport, with the row locked until the end of the unit of work: the
   * enrollment locks the same row before saving, and without that a list saved in
   * the middle of the draw would be left out of a bracket that already closed enrollments. Only
   * holds inside `UnitOfWork.run`.
   */
  abstract lockSport(sportId: string): Promise<AdministratorSportShowResponse | null>
  /** The category's classrooms with at least `minAthletes` enrolled in the sport. */
  abstract eligibleClassroomIds(
    sportId: string,
    category: Category,
    minAthletes: number,
  ): Promise<string[]>
  /** The name of each classroom, by id. */
  abstract classroomNames(classroomIds: ReadonlyArray<string>): Promise<Map<string, string>>
  /** Saves the whole bracket: new, in batch; existing, only what changed. */
  /** Saves the bracket; the already drawn sport and category (the race on the `unique`) come back as `BRACKET_ALREADY_EXISTS`. */
  abstract save(bracket: Bracket): Promise<Either<BracketError, void>>
  /** Teams and matches go along. */
  abstract delete(bracket: Bracket): Promise<void>

  /** Lightweight read: the draw preview, or `null` if the sport does not exist. */
  abstract preview(
    sportId: string,
    category: Category,
  ): Promise<AdministratorBracketPreviewResponse | null>
  abstract paginate(
    criteria: BracketListCriteria,
  ): Promise<Paginated<AdministratorBracketPaginateResponse>>
  abstract paginateMatches(
    criteria: MatchListCriteria,
  ): Promise<Paginated<AdministratorMatchPaginateResponse>>
  /**
   * The matches with both teams, the whole classrooms and the bracket with the sport,
   * by id. In batch so the card fetches those of a page in a single trip.
   */
  abstract findMatchResponses(
    matchIds: ReadonlyArray<string>,
  ): Promise<Map<string, AdministratorMatchUpdateResponse>>
  /** The students of the match's two classrooms, those enrolled in the sport first. */
  abstract matchAthletes(matchId: string): Promise<AdministratorMatchAthletesResponse | null>

  /** The match with both teams, the whole classrooms and the bracket with the sport. */
  async findMatchResponse(matchId: string): Promise<AdministratorMatchUpdateResponse | null> {
    const responses = await this.findMatchResponses([matchId])

    return responses.get(matchId) ?? null
  }

  /**
   * The whole bracket as the screen draws it: the matches of each phase with the
   * classroom names. Composed of what both implementations already know how to read, so the
   * response shape exists only once.
   */
  async detail(id: string): Promise<AdministratorBracketShowResponse | null> {
    const bracket = await this.findById(id)
    if (!bracket) return null

    const snapshot = bracket.snapshot()
    const sport = await this.findSport(snapshot.sportId)
    if (!sport) return null

    const names = await this.classroomNames(snapshot.teams.map((team) => team.classroomId))
    const classroomOf = new Map(snapshot.teams.map((team) => [team.id, team.classroomId]))
    const nameOf = (teamId: string | null): string | null => {
      if (teamId === null) return null
      const classroomId = classroomOf.get(teamId)
      if (classroomId === undefined) return null

      return names.get(classroomId) ?? null
    }

    return {
      id: snapshot.id,
      category: snapshot.category,
      status: snapshot.status,
      sport: { id: sport.id, name: sport.name, slug: sport.slug },
      championTeamId: bracket.champion(),
      matches: [...snapshot.matches]
        .sort((a, b) => a.round - b.round || a.position - b.position)
        .map((match) => ({
          id: match.id,
          phase: match.phase,
          round: match.round,
          position: match.position,
          status: match.status,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeName: nameOf(match.homeTeamId),
          awayName: nameOf(match.awayTeamId),
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          winnerTeamId: match.winnerTeamId,
          scheduledAt: match.scheduledAt?.toISOString() ?? null,
          location: match.location,
        })),
    }
  }
}
