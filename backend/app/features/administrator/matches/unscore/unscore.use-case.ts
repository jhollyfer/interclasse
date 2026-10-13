import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import Bracket from '#models/bracket'
import Match from '#models/match'
import { advanceSlot, nextPhase } from '#features/_shared.tournament'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { BracketStatuses, MatchStatuses } from '#core/entity'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, Match>

/**
 * O caminho de volta do placar: lançado errado, ele sai, e o vencedor sai
 * junto da partida seguinte.
 *
 * Só desfaz o que ainda não andou: com a seguinte jogada, apagar este placar
 * deixaria lá um time que não se sabe mais por que estava.
 */
@inject()
export default class AdministratorMatchUnscoreUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const match = await Match.find(id)

      if (!match) return left(HTTPException.NotFound('Partida não encontrada', 'MATCH_NOT_FOUND'))

      if (match.status !== MatchStatuses.FINISHED)
        return left(HTTPException.Conflict('A partida ainda não tem placar', 'MATCH_NOT_PLAYED'))

      const phase = nextPhase(match.phase)
      const slot = advanceSlot(match.position)

      const outcome = await db.transaction(async (trx) => {
        // A mesma trava do placar: os dois mexem na partida seguinte.
        const bracket = await Bracket.query({ client: trx })
          .where('id', match.bracketId)
          .forUpdate()
          .firstOrFail()

        let next: Match | null = null
        if (phase)
          next = await Match.query({ client: trx })
            .where('bracketId', match.bracketId)
            .where('phase', phase)
            .where('position', slot.position)
            .first()

        if (next && next.status === MatchStatuses.FINISHED) return 'next-played'

        if (next) {
          next.useTransaction(trx)
          if (slot.side === 'home' && next.homeTeamId === match.winnerTeamId) next.homeTeamId = null
          if (slot.side === 'away' && next.awayTeamId === match.winnerTeamId) next.awayTeamId = null
          await next.save()
        }

        match.useTransaction(trx)
        match.merge({
          homeScore: null,
          awayScore: null,
          winnerTeamId: null,
          status: MatchStatuses.SCHEDULED,
        })
        await match.save()

        // Sem final jogada, não há campeã: a chave volta a estar em disputa.
        if (bracket.status === BracketStatuses.FINISHED) {
          bracket.useTransaction(trx)
          bracket.status = BracketStatuses.KNOCKOUT
          await bracket.save()
        }

        return 'undone'
      })

      if (outcome === 'next-played')
        return left(
          HTTPException.Conflict(
            'A partida seguinte já tem placar: desfaça-a antes',
            'NEXT_MATCH_PLAYED',
          ),
        )

      await match.load('homeTeam', (team) => {
        team.preload('classroom')
      })
      await match.load('awayTeam', (team) => {
        team.preload('classroom')
      })
      await match.load('bracket', (bracket) => {
        bracket.preload('sport')
      })

      return right(match)
    } catch (error) {
      logger.error({ err: error }, '[matches > unscore][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'MATCH_UNSCORE_ERROR'),
      )
    }
  }
}
