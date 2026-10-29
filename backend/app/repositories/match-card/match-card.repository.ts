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
  /** Os cartões dos atletas desta turma. */
  readonly classroomId?: string
  readonly studentId?: string
}

/** O aluno como o cartão o mostra. */
export type CardStudent = {
  readonly id: string
  readonly name: string
  readonly classroomId: string
  readonly createdAt: Date
  readonly updatedAt: Date | null
}

/**
 * A persistência do cartão, por intenção (`_standards/domain.md` §5.1). O
 * escritor único da tabela `match_cards`; lê o aluno só para responder em que
 * turma ele está, e a partida pelo contrato da chave, que é quem a conhece.
 */
export abstract class MatchCardRepository {
  abstract findById(id: string): Promise<MatchCard | null>
  /** A turma do aluno, ou `null` se o aluno não existe. */
  abstract findStudentClassroom(studentId: string): Promise<string | null>
  abstract save(card: MatchCard): Promise<void>
  abstract delete(card: MatchCard): Promise<void>
  /** Leitura leve: a forma da resposta direto da query, do mais novo ao mais antigo. */
  abstract paginate(
    criteria: CardListCriteria,
  ): Promise<Paginated<AdministratorCardPaginateResponse>>
  /** O cartão lido como a lista o mostra, ou `null` se não existe. */
  abstract findResponse(id: string): Promise<AdministratorCardPaginateResponse | null>

  /**
   * Monta a resposta do cartão com o aluno e a partida já lidos. O time por que
   * o atleta jogava é um dos dois da partida; existir uma vez aqui é o que faz as
   * duas implementações responderem igual. `null` se o time não é da partida.
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
