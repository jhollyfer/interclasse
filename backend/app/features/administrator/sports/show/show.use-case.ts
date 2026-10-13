import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import Sport from '#models/sport'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, Sport>

@inject()
export default class AdministratorSportShowUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const sport = await Sport.find(id)

      if (!sport)
        return left(HTTPException.NotFound('Modalidade não encontrada', 'SPORT_NOT_FOUND'))

      return right(sport)
    } catch (error) {
      logger.error({ err: error }, '[sports > show][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_SPORT_SHOW_ERROR',
        ),
      )
    }
  }
}
