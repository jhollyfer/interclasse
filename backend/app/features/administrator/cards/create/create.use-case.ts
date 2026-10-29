import { randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type AdministratorCardCreateResponse, type Either } from '@interclasse/shared'

import { CardRefusal } from '../_shared.card-refusal.ts'

import { MatchCard } from '#domain/match-card/match-card.entity'
import { BracketRepository } from '#repositories/bracket/bracket.repository'
import { MatchCardRepository } from '#repositories/match-card/match-card.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorCardCreatePayload } from '#validators/administrator/cards.validator'

type Payload = AdministratorCardCreatePayload
type Response = Either<HTTPException, AdministratorCardCreateResponse>

/**
 * Lança um cartão. O atleta tem que ser de uma das duas turmas da partida (regra
 * da entidade): o time do cartão sai daí, e não do corpo.
 *
 * Grava só o cartão. A chave entra apenas para dizer quem joga a partida, e é o
 * repository dela que a conhece (um agregado por transação).
 */
@inject()
export default class AdministratorCardCreateUseCase {
  constructor(
    private readonly cards: MatchCardRepository,
    private readonly brackets: BracketRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const bracket = await this.brackets.findByMatchId(payload.matchId)
      const classroomId = await this.cards.findStudentClassroom(payload.studentId)
      const lineup = bracket?.lineupOf(payload.matchId, classroomId)
      if (!lineup)
        return left(
          HTTPException.UnprocessableEntity(
            this.i18n.t('cards.match_not_found'),
            'MATCH_NOT_FOUND',
            { matchId: this.i18n.t('cards.match_not_found') },
          ),
        )

      const launched = MatchCard.launch({
        id: randomUUID(),
        matchId: payload.matchId,
        studentId: payload.studentId,
        color: payload.color,
        note: payload.note ?? null,
        now: new Date(),
        homeTeamId: lineup.homeTeamId,
        awayTeamId: lineup.awayTeamId,
        studentTeamId: lineup.classroomTeamId,
      })
      if (launched.isLeft()) return left(CardRefusal.http(launched.value, this.i18n))

      await this.cards.save(launched.value)

      const response = await this.cards.findResponse(launched.value.id)
      if (!response) throw new Error('cartão gravado e não encontrado')

      return right(response)
    } catch (error) {
      logger.error({ err: error }, '[administrator/cards > create][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_CARD_CREATE_ERROR',
        ),
      )
    }
  }
}
