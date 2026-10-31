import type {
  AdministratorCardPaginateResponse,
  AdministratorMatchUpdateResponse,
  Paginated,
} from '@interclasse/shared'

import type { MatchCard, MatchCardProps } from '#domain/match-card/match-card.entity'

export type CardListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly matchId?: string
  /** The cards of this classroom's athletes. */
  readonly classroomId?: string
  readonly studentId?: string
}

/** The student as the card shows it. */
export type CardStudent = {
  readonly id: string
  readonly name: string
  readonly classroomId: string
  readonly createdAt: Date
  readonly updatedAt: Date | null
}

/**
 * The card persistence, by intent (`_standards/domain.md` §5.1). The
 * single writer of the `match_cards` table; it reads the student only to answer which
 * classroom they are in, and the match through the bracket contract, which is who knows it.
 */
export abstract class MatchCardRepository {
  abstract findById(id: string): Promise<MatchCard | null>
  /** The student's classroom, or `null` if the student does not exist. */
  abstract findStudentClassroom(studentId: string): Promise<string | null>
  abstract save(card: MatchCard): Promise<void>
  abstract delete(card: MatchCard): Promise<void>
  /** Lightweight read: the response shape straight from the query, newest to oldest. */
  abstract paginate(
    criteria: CardListCriteria,
  ): Promise<Paginated<AdministratorCardPaginateResponse>>
  /** The card read as the list shows it, or `null` if it does not exist. */
  abstract findResponse(id: string): Promise<AdministratorCardPaginateResponse | null>

  /**
   * Builds the card response with the student and the match already read. The team the
   * athlete played for is one of the match's two; existing once here is what makes both
   * implementations answer the same. `null` if the team is not in the match.
   */
  protected assemble(
    card: MatchCardProps,
    student: CardStudent,
    match: AdministratorMatchUpdateResponse,
  ): AdministratorCardPaginateResponse | null {
    const team = [match.homeTeam, match.awayTeam].find((candidate) => candidate?.id === card.teamId)
    if (!team) return null

    return {
      id: card.id,
      matchId: card.matchId,
      teamId: card.teamId,
      studentId: card.studentId,
      color: card.color,
      note: card.note,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt?.toISOString() ?? null,
      student: {
        id: student.id,
        classroomId: student.classroomId,
        name: student.name,
        createdAt: student.createdAt.toISOString(),
        updatedAt: student.updatedAt?.toISOString() ?? null,
      },
      team,
      match,
    }
  }
}
