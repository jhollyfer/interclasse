import { left, right, type CardColor, type Either } from '@interclasse/shared'

import type { MatchCardError } from './match-card.errors.ts'

export type MatchCardProps = {
  readonly id: string
  /** Another aggregate (the bracket) enters only by id. */
  readonly matchId: string
  /** The team the athlete played for: it comes from their classroom, not from the request body. */
  readonly teamId: string
  readonly studentId: string
  color: CardColor
  note: string | null
  readonly createdAt: Date
  updatedAt: Date | null
}

type LaunchInput = {
  readonly id: string
  readonly matchId: string
  readonly studentId: string
  readonly color: CardColor
  readonly note: string | null
  readonly now: Date
  /** The two teams of the match; null while the bracket has not defined them. */
  readonly homeTeamId: string | null
  readonly awayTeamId: string | null
  /** The team of the athlete's classroom among the match's, or null if they are an outsider. */
  readonly studentTeamId: string | null
}

/**
 * The card an athlete received in a match (`_standards/domain.md` §1). The rule
 * that protects it: only someone from one of the match's two classrooms receives a card.
 */
export class MatchCard {
  private constructor(private readonly props: MatchCardProps) {}

  /** Enters the card. The id and the clock come from outside: the domain does no I/O. */
  static launch(input: LaunchInput): Either<MatchCardError, MatchCard> {
    if (!input.homeTeamId || !input.awayTeamId) return left({ code: 'MATCH_TEAMS_PENDING' })

    const playing =
      input.studentTeamId === input.homeTeamId || input.studentTeamId === input.awayTeamId
    if (!input.studentTeamId || !playing) return left({ code: 'STUDENT_NOT_IN_MATCH' })

    return right(
      new MatchCard({
        id: input.id,
        matchId: input.matchId,
        teamId: input.studentTeamId,
        studentId: input.studentId,
        color: input.color,
        note: input.note,
        createdAt: input.now,
        // Born with the edit stamped, the way the database row is born.
        updatedAt: input.now,
      }),
    )
  }

  /** Rehydration by the repository: the data passed through the invariants when it was saved. */
  static restore(props: MatchCardProps): MatchCard {
    return new MatchCard({ ...props })
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<MatchCardProps> {
    return { ...this.props }
  }
}
