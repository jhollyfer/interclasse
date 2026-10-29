import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { BRACKET_STATUS, MATCH_STATUS, left, right, type Either } from '@interclasse/shared'

import Bracket from '#models/bracket'
import Match from '#models/match'
import { advanceSlot, nextPhase } from '#features/_shared.tournament'
import HTTPException from '#exceptions/http.exception'
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

      if (match.status !== MATCH_STATUS.FINISHED)
        return left(HTTPException.Conflict('A partida ainda não tem placar', 'MATCH_NOT_PLAYED'))

      const phase = nextPhase(match.phase)
      const slot = advanceSlot(match.position)

      const outcome = await db.transaction(async (trx) => {
        // A mesma trava do placar: os dois mexem na partida seguinte.
        const bracket = await Bracket.query({ client: trx })
          .where('id', match.bracketId)
          .forUpdate()
          .first()

        // A partida aponta para a chave por FK; ausente, o caso de uso responde
        // 404 de negócio em vez de cair no catch como 500 (`*OrFail` é `throw`).
        if (!bracket) return 'bracket-missing'

        let next: Match | null = null
        if (phase)
          next = await Match.query({ client: trx })
            .where('bracketId', match.bracketId)
            .where('phase', phase)
            .where('position', slot.position)
            .first()

        if (next && next.status === MATCH_STATUS.FINISHED) return 'next-played'

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
          status: MATCH_STATUS.SCHEDULED,
        })
        await match.save()

        // Sem final jogada, não há campeã: a chave volta a estar em disputa.
        if (bracket.status === BRACKET_STATUS.FINISHED) {
          bracket.useTransaction(trx)
          bracket.status = BRACKET_STATUS.KNOCKOUT
          await bracket.save()
        }

        return 'undone'
      })

      if (outcome === 'bracket-missing')
        return left(HTTPException.NotFound('Chave não encontrada', 'BRACKET_NOT_FOUND'))

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
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_MATCH_UNSCORE_ERROR',
        ),
      )
    }
  }
}
