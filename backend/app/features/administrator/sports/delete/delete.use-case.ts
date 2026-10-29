import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import Bracket from '#models/bracket'
import Enrollment from '#models/enrollment'
import Sport from '#models/sport'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, Sport>

@inject()
export default class AdministratorSportDeleteUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const sport = await Sport.find(id)

      if (!sport)
        return left(HTTPException.NotFound('Modalidade não encontrada', 'SPORT_NOT_FOUND'))

      const [enrollment, bracket] = await Promise.all([
        Enrollment.findBy('sportId', sport.id),
        Bracket.findBy('sportId', sport.id),
      ])

      if (enrollment || bracket)
        return left(HTTPException.Conflict('A modalidade tem inscrições', 'SPORT_IN_USE'))

      await sport.delete()

      return right(sport)
    } catch (error) {
      logger.error({ err: error }, '[sports > delete][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_SPORT_DELETE_ERROR',
        ),
      )
    }
  }
}
