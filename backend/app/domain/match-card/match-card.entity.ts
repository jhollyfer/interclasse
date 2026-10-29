import { left, right, type CardColor, type Either } from '@interclasse/shared'

import type { MatchCardError } from './match-card.errors.ts'

export type MatchCardProps = {
  readonly id: string
  /** Outro agregado (a chave) entra só por id. */
  readonly matchId: string
  /** O time por que o atleta jogava: sai da turma dele, e não do corpo do pedido. */
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
  /** Os dois times da partida; nulo enquanto a chave não os definiu. */
  readonly homeTeamId: string | null
  readonly awayTeamId: string | null
  /** O time da turma do atleta entre os da partida, ou nulo se ele é de fora. */
  readonly studentTeamId: string | null
}

/**
 * O cartão que um atleta levou numa partida (`_standards/domain.md` §1). A regra
 * que o protege: só leva cartão quem é de uma das duas turmas da partida.
 */
export class MatchCard {
  private constructor(private readonly props: MatchCardProps) {}

  /** Lança o cartão. O id e o relógio chegam de fora: o domínio não faz I/O. */
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
        // Nasce com a edição carimbada, como a linha do banco nasce.
        updatedAt: input.now,
      }),
    )
  }

  /** Reidratação pelo repository: o dado passou pelas invariantes ao ser gravado. */
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
