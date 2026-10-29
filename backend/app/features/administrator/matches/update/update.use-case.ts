import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either, type Merge } from '@interclasse/shared'

import Match from '#models/match'
import HTTPException from '#exceptions/http.exception'
import type { MatchUpdatePayload } from '#validators/administrator/matches.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<MatchUpdatePayload, IdentifierPayload>
type Response = Either<HTTPException, Match>

@inject()
export default class AdministratorMatchUpdateUseCase {
  async execute({ id, scheduledAt, location }: Payload): Promise<Response> {
    try {
      const match = await Match.find(id)

      if (!match) return left(HTTPException.NotFound('Partida não encontrada', 'MATCH_NOT_FOUND'))

      if (scheduledAt !== undefined) match.scheduledAt = scheduledAt

      if (location !== undefined) match.location = location

      await match.save()
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
      logger.error({ err: error }, '[matches > update][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_MATCH_UPDATE_ERROR',
        ),
      )
    }
  }
}
