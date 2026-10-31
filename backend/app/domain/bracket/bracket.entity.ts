import {
  BRACKET_STATUS,
  MATCH_PHASE,
  MATCH_STATUS,
  left,
  right,
  type BracketStatus,
  type Category,
  type Either,
  type MatchPhase,
  type MatchStatus,
} from '@interclasse/shared'

import type { BracketError, MatchError } from './bracket.errors.ts'

import { Knockout, type Pairing, type Random } from '#domain/shared/knockout.value-object'

/** The team is the classroom inside the competition. */
export type TeamProps = {
  readonly id: string
  readonly classroomId: string
  readonly createdAt: Date
  updatedAt: Date | null
}

/** The bracket match: it only changes through the root (`Bracket`), and has no repository of its own. */
export type MatchProps = {
  readonly id: string
  readonly phase: MatchPhase
  readonly round: number
  readonly position: number
  status: MatchStatus
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number | null
  awayScore: number | null
  winnerTeamId: string | null
  scheduledAt: Date | null
  location: string | null
  readonly createdAt: Date
  updatedAt: Date | null
}

export type BracketProps = {
  readonly id: string
  readonly sportId: string
  readonly category: Category
  status: BracketStatus
  readonly createdAt: Date
  updatedAt: Date | null
  readonly teams: TeamProps[]
  readonly matches: MatchProps[]
}

/** Who plays the match: the two teams and, when asked, the team of a classroom. */
export type Lineup = {
  readonly homeTeamId: string | null
  readonly awayTeamId: string | null
  readonly classroomTeamId: string | null
}

type DrawInput = {
  readonly id: string
  readonly sportId: string
  readonly category: Category
  /** The sport's minimum athletes: it only enters the fact, when classrooms are lacking. */
  readonly minAthletes: number
  /** The category's classrooms with enough enrolled to form a team. */
  readonly classroomIds: ReadonlyArray<string>
  readonly newId: () => string
  readonly random: Random
  readonly now: Date
}

type ScoreInput = {
  readonly homeScore: number
  readonly awayScore: number
  readonly winnerTeamId?: string
}

type ScheduleChanges = {
  readonly scheduledAt?: Date | null
  readonly location?: string | null
}

/**
 * The competition of a sport in a category: the aggregate with the teams and the
 * matches (`_standards/domain.md` §4). It holds the draw, the winner's advance
 * through the bracket and the closing with a champion; team and match only change through here.
 */
export class Bracket {
  private constructor(private readonly props: BracketProps) {}

  /**
   * The draw: builds the whole knockout bracket, from the first phase to the final. The
   * id, the clock and the draw come from outside: the domain does no I/O.
   */
  static draw(input: DrawInput): Either<BracketError, Bracket> {
    if (input.classroomIds.length < Knockout.MIN_TEAMS)
      return left({
        code: 'NOT_ENOUGH_TEAMS',
        minTeams: Knockout.MIN_TEAMS,
        minAthletes: input.minAthletes,
      })

    if (input.classroomIds.length > Knockout.MAX_TEAMS)
      return left({ code: 'TOO_MANY_TEAMS', maxTeams: Knockout.MAX_TEAMS })

    const pairings = Knockout.pair(input.classroomIds, input.random)
    const teams = Bracket.teamsOf(pairings, input)

    return right(
      new Bracket({
        id: input.id,
        sportId: input.sportId,
        category: input.category,
        status: BRACKET_STATUS.KNOCKOUT,
        createdAt: input.now,
        // Born with the edit stamped, the way the database row is born.
        updatedAt: input.now,
        teams,
        matches: Bracket.matchesOf(pairings, teams, input),
      }),
    )
  }

  /** Rehydration by the repository: the data passed through the invariants when it was saved. */
  static restore(props: BracketProps): Bracket {
    return new Bracket(structuredClone(props))
  }

  /**
   * Only a bracket without results can go: with a score entered, deleting would take away
   * what happened on the court, irreversibly.
   */
  ensureDeletable(): Either<BracketError, Bracket> {
    if (this.props.matches.some((match) => match.status === MATCH_STATUS.FINISHED))
      return left({ code: 'BRACKET_HAS_RESULTS' })

    return right(this)
  }

  /** Date, time and venue. Absent means "leave alone"; `null` unschedules. */
  schedule(matchId: string, changes: ScheduleChanges, now: Date): Either<MatchError, Bracket> {
    const match = this.matchOf(matchId)
    if (!match) return left({ code: 'MATCH_NOT_FOUND' })

    if (changes.scheduledAt !== undefined) match.scheduledAt = changes.scheduledAt
    if (changes.location !== undefined) match.location = changes.location
    match.updatedAt = now

    return right(this)
  }

  /**
   * The score, and what it moves: the winner advances to the next match, and the
   * final closes the bracket. A tie only with the penalty winner.
   */
  score(matchId: string, input: ScoreInput, now: Date): Either<MatchError, Bracket> {
    const match = this.matchOf(matchId)
    if (!match) return left({ code: 'MATCH_NOT_FOUND' })

    if (!match.homeTeamId || !match.awayTeamId) return left({ code: 'MATCH_TEAMS_PENDING' })

    const winner = Bracket.winnerOf(match, input)
    if (!winner) return left({ code: 'MATCH_WINNER_REQUIRED' })

    const next = this.nextOf(match)
    // Changing the winner after they have already played the next one would rewrite a
    // result that happened on the court.
    if (
      next &&
      next.status === MATCH_STATUS.FINISHED &&
      match.winnerTeamId !== null &&
      match.winnerTeamId !== winner
    )
      return left({ code: 'MATCH_NEXT_PLAYED_ON_SCORE' })

    match.homeScore = input.homeScore
    match.awayScore = input.awayScore
    match.winnerTeamId = winner
    match.status = MATCH_STATUS.FINISHED
    match.updatedAt = now

    if (next) {
      const { side } = Knockout.advanceSlot(match.position)
      if (side === 'home') next.homeTeamId = winner
      if (side === 'away') next.awayTeamId = winner
      next.updatedAt = now
    }

    if (match.phase === MATCH_PHASE.FINAL) {
      this.props.status = BRACKET_STATUS.FINISHED
      this.props.updatedAt = now
    }

    return right(this)
  }

  /**
   * The way back of the score: entered wrongly, it comes out, and the winner comes out
   * of the next match with it. It only undoes what has not moved on yet.
   */
  unscore(matchId: string, now: Date): Either<MatchError, Bracket> {
    const match = this.matchOf(matchId)
    if (!match) return left({ code: 'MATCH_NOT_FOUND' })

    if (match.status !== MATCH_STATUS.FINISHED) return left({ code: 'MATCH_NOT_PLAYED' })

    const next = this.nextOf(match)
    if (next && next.status === MATCH_STATUS.FINISHED)
      return left({ code: 'MATCH_NEXT_PLAYED_ON_UNSCORE' })

    if (next) {
      const { side } = Knockout.advanceSlot(match.position)
      if (side === 'home' && next.homeTeamId === match.winnerTeamId) next.homeTeamId = null
      if (side === 'away' && next.awayTeamId === match.winnerTeamId) next.awayTeamId = null
      next.updatedAt = now
    }

    match.homeScore = null
    match.awayScore = null
    match.winnerTeamId = null
    match.status = MATCH_STATUS.SCHEDULED
    match.updatedAt = now

    // Without a played final, there is no champion: the bracket goes back to being in progress.
    if (this.props.status === BRACKET_STATUS.FINISHED) {
      this.props.status = BRACKET_STATUS.KNOCKOUT
      this.props.updatedAt = now
    }

    return right(this)
  }

  /**
   * The two teams of the match and, among them, the one of the given classroom: where the card
   * gets the athlete's team from. `null` if the match is not from this bracket.
   */
  lineupOf(matchId: string, classroomId: string | null): Lineup | null {
    const match = this.matchOf(matchId)
    if (!match) return null

    const playing = this.props.teams.filter(
      (team) => team.id === match.homeTeamId || team.id === match.awayTeamId,
    )

    return {
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      classroomTeamId: playing.find((team) => team.classroomId === classroomId)?.id ?? null,
    }
  }

  /** The champion of a finished bracket: the winner of the final. */
  champion(): string | null {
    if (this.props.status !== BRACKET_STATUS.FINISHED) return null

    const final = this.props.matches.find((match) => match.phase === MATCH_PHASE.FINAL)

    return final?.winnerTeamId ?? null
  }

  get id(): string {
    return this.props.id
  }

  get sportId(): string {
    return this.props.sportId
  }

  snapshot(): Readonly<BracketProps> {
    return structuredClone(this.props)
  }

  private matchOf(matchId: string): MatchProps | undefined {
    return this.props.matches.find((match) => match.id === matchId)
  }

  /** The match where the winner enters: position `position / 2` of the next phase. */
  private nextOf(match: MatchProps): MatchProps | undefined {
    const phase = Knockout.nextPhase(match.phase)
    if (!phase) return undefined

    const { position } = Knockout.advanceSlot(match.position)

    return this.props.matches.find((other) => other.phase === phase && other.position === position)
  }

  /** The score decides; a tie only with the penalty winner, and it must be one of the two. */
  private static winnerOf(match: MatchProps, input: ScoreInput): string | null {
    if (input.homeScore > input.awayScore) return match.homeTeamId
    if (input.awayScore > input.homeScore) return match.awayTeamId
    if (input.winnerTeamId === match.homeTeamId || input.winnerTeamId === match.awayTeamId)
      return input.winnerTeamId ?? null

    return null
  }

  private static teamsOf(pairings: ReadonlyArray<Pairing<string>>, input: DrawInput): TeamProps[] {
    const classroomIds = pairings.flatMap((pairing) => {
      if (pairing.away) return [pairing.home, pairing.away]

      return [pairing.home]
    })

    return classroomIds.map((classroomId) => ({
      id: input.newId(),
      classroomId,
      createdAt: input.now,
      updatedAt: input.now,
    }))
  }

  /**
   * The matches of the whole bracket. The following phases are born empty and are
   * filled by the winners; the bye team already enters the next phase, in the
   * place where the winner of its match would enter.
   */
  private static matchesOf(
    pairings: ReadonlyArray<Pairing<string>>,
    teams: ReadonlyArray<TeamProps>,
    input: DrawInput,
  ): MatchProps[] {
    const teamOf = new Map(teams.map((team) => [team.classroomId, team.id]))
    const matches: MatchProps[] = []
    const advanced = new Map<number, { home?: string; away?: string }>()
    let phase = Knockout.phaseOf(Knockout.sizeFor(teams.length))
    let round = 1
    let size = pairings.length

    // First phase: only the real matchups; the bye goes straight up.
    for (const [position, pairing] of pairings.entries()) {
      const home = teamOf.get(pairing.home) ?? null

      if (!pairing.away) {
        const slot = Knockout.advanceSlot(position)
        advanced.set(slot.position, {
          ...advanced.get(slot.position),
          [slot.side]: home ?? undefined,
        })
        continue
      }

      matches.push(
        Bracket.emptyMatch(input, {
          phase: phase ?? MATCH_PHASE.FINAL,
          round,
          position,
          homeTeamId: home,
          awayTeamId: teamOf.get(pairing.away) ?? null,
        }),
      )
    }

    phase = phase && Knockout.nextPhase(phase)
    size /= 2

    while (phase) {
      round += 1
      for (let position = 0; position < size; position++) {
        const filled = advanced.get(position)
        matches.push(
          Bracket.emptyMatch(input, {
            phase,
            round,
            position,
            homeTeamId: filled?.home ?? null,
            awayTeamId: filled?.away ?? null,
          }),
        )
      }

      advanced.clear()
      phase = Knockout.nextPhase(phase)
      size /= 2
    }

    return matches
  }

  private static emptyMatch(
    input: DrawInput,
    place: Pick<MatchProps, 'phase' | 'round' | 'position' | 'homeTeamId' | 'awayTeamId'>,
  ): MatchProps {
    return {
      id: input.newId(),
      ...place,
      status: MATCH_STATUS.SCHEDULED,
      homeScore: null,
      awayScore: null,
      winnerTeamId: null,
      scheduledAt: null,
      location: null,
      createdAt: input.now,
      updatedAt: input.now,
    }
  }
}
