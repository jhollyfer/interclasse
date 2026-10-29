import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'
import { PAGINATION, left, right, type Either, type Paginated } from '@interclasse/shared'

import Bracket from '#models/bracket'
import Sport from '#models/sport'
import HTTPException from '#exceptions/http.exception'
import type { BracketPaginatePayload } from '#validators/storefront/brackets.validator'

type Payload = BracketPaginatePayload
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class StorefrontBracketPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const query = Bracket.query().preload('sport')

      if (payload.sportId) query.where('sportId', payload.sportId)
      if (payload.category) query.where('category', payload.category)

      // Por modalidade e categoria: é como o site agrupa as abas.
      const brackets = await query
        .orderBy(Sport.query().whereColumn('sports.id', 'brackets.sport_id').select('name'), 'asc')
        .orderBy('category', 'asc')
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: brackets.getMeta(), data: brackets.all() })
    } catch (error) {
      logger.error({ err: error }, '[brackets > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'STOREFRONT_BRACKET_PAGINATE_ERROR',
        ),
      )
    }
  }
}
