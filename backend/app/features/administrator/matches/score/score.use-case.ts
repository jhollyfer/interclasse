import Bracket from '#models/bracket'
import Match from '#models/match'
import db from '@adonisjs/lucid/services/db'
import { advanceSlot, nextPhase } from '#features/_shared.tournament'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { BracketStatuses, MatchPhases, MatchStatuses, type Merge } from '#core/entity'
import type { MatchScorePayload } from '#features/administrator/matches/matches.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<MatchScorePayload, IdentifierPayload>
type Response = Either<HTTPException, Match>

/**
 * O placar, e o que ele move: o vencedor avança para a partida seguinte, e a
 * final encerra a chave.
 */
@inject()
export default class AdministratorMatchScoreUseCase {
  async execute({ id, homeScore, awayScore, winnerTeamId }: Payload): Promise<Response> {
    try {
      const match = await Match.find(id)

      if (!match) return left(HTTPException.NotFound('Partida não encontrada', 'MATCH_NOT_FOUND'))

      if (!match.homeTeamId || !match.awayTeamId)
        return left(
          HTTPException.Conflict(
            'A partida ainda não tem os dois times definidos',
            'MATCH_TEAMS_PENDING'
          )
        )

      const winner = this.winnerOf(match, homeScore, awayScore, winnerTeamId)

      if (!winner)
        return left(
          HTTPException.UnprocessableEntity('Informe quem venceu', 'MATCH_WINNER_REQUIRED', {
            winnerTeamId: 'Empate: selecione quem venceu nos pênaltis',
          })
        )

      const phase = nextPhase(match.phase)
      const slot = advanceSlot(match.position)

      const outcome = await db.transaction(async (trx) => {
        // A linha da chave trava: dois placares ao mesmo tempo na mesma chave
        // leriam a mesma partida seguinte e um sobrescreveria o outro.
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

        // Trocar o vencedor depois que ele já jogou a próxima reescreveria um
        // resultado que aconteceu em quadra.
        if (
          next &&
          next.status === MatchStatuses.FINISHED &&
          match.winnerTeamId !== null &&
          match.winnerTeamId !== winner
        )
          return 'next-played'

        match.useTransaction(trx)
        match.merge({ homeScore, awayScore, winnerTeamId: winner, status: MatchStatuses.FINISHED })
        await match.save()

        if (next) {
          next.useTransaction(trx)
          if (slot.side === 'home') next.homeTeamId = winner
          if (slot.side === 'away') next.awayTeamId = winner
          await next.save()
        }

        if (match.phase === MatchPhases.FINAL) {
          bracket.useTransaction(trx)
          bracket.status = BracketStatuses.FINISHED
          await bracket.save()
        }

        return 'saved'
      })

      if (outcome === 'next-played')
        return left(
          HTTPException.Conflict(
            'A partida seguinte já tem placar: corrija-a antes',
            'NEXT_MATCH_PLAYED'
          )
        )

      return right(await this.loaded(match))
    } catch (error) {
      logger.error({ err: error }, '[matches > score][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'MATCH_SCORE_ERROR')
      )
    }
  }

  /** Placar decide; empate só com o vencedor dos pênaltis, e ele tem que ser um dos dois. */
  private winnerOf(
    match: Match,
    homeScore: number,
    awayScore: number,
    winnerTeamId?: string
  ): string | null {
    if (homeScore > awayScore) return match.homeTeamId
    if (awayScore > homeScore) return match.awayTeamId
    if (winnerTeamId === match.homeTeamId || winnerTeamId === match.awayTeamId)
      return winnerTeamId ?? null

    return null
  }

  private async loaded(match: Match): Promise<Match> {
    await match.load('homeTeam', (team) => team.preload('classroom'))
    await match.load('awayTeam', (team) => team.preload('classroom'))
    await match.load('bracket', (bracket) => bracket.preload('sport'))

    return match
  }
}
