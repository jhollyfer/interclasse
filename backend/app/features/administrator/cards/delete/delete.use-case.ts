import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import MatchCard from '#models/match-card'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, MatchCard>

/** Apaga o cartão lançado por engano. */
@inject()
export default class AdministratorCardDeleteUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const card = await MatchCard.find(id)

      if (!card) return left(HTTPException.NotFound('Cartão não encontrado', 'CARD_NOT_FOUND'))

      await card.delete()

      return right(card)
    } catch (error) {
      logger.error({ err: error }, '[cards > delete][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_CARD_DELETE_ERROR',
        ),
      )
    }
  }
}
