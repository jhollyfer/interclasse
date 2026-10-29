import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'
import { PAGINATION, left, right, type Either, type Paginated } from '@interclasse/shared'

import Bracket from '#models/bracket'
import HTTPException from '#exceptions/http.exception'
import type { BracketPaginatePayload } from '#validators/administrator/brackets.validator'

type Payload = BracketPaginatePayload
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class AdministratorBracketPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const query = Bracket.query().preload('sport')

      if (payload.sportId) query.where('sportId', payload.sportId)
      if (payload.category) query.where('category', payload.category)
      if (payload.status) query.where('status', payload.status)

      const brackets = await query
        .orderBy('createdAt', 'desc')
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: brackets.getMeta(), data: brackets.all() })
    } catch (error) {
      logger.error({ err: error }, '[brackets > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_BRACKET_PAGINATE_ERROR',
        ),
      )
    }
  }
}
