import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import Bracket from '#models/bracket'
import Match from '#models/match'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { MatchStatuses } from '#core/entity'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, Bracket>

/**
 * Times e partidas vão junto por `CASCADE`.
 *
 * Só sai a chave sem resultado: com placar lançado, apagar levaria embora o
 * que aconteceu em quadra, sem volta. Para refazer uma chave já jogada,
 * desfazem-se os placares antes (`DELETE /administrator/matches/:id/score`).
 */
@inject()
export default class AdministratorBracketDeleteUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const bracket = await Bracket.find(id)

      if (!bracket) return left(HTTPException.NotFound('Chave não encontrada', 'BRACKET_NOT_FOUND'))

      const played = await Match.query()
        .where('bracketId', bracket.id)
        .where('status', MatchStatuses.FINISHED)
        .first()

      if (played)
        return left(
          HTTPException.Conflict(
            'A chave já tem placar lançado: desfaça os placares antes de apagá-la',
            'BRACKET_HAS_RESULTS',
          ),
        )

      await bracket.delete()

      return right(bracket)
    } catch (error) {
      logger.error({ err: error }, '[brackets > delete][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'BRACKET_DELETE_ERROR'),
      )
    }
  }
}
