import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'
import { PAGINATION, left, right, type Either, type Paginated } from '@interclasse/shared'

import Sport from '#models/sport'
import HTTPException from '#exceptions/http.exception'
import type { PaginationPayload } from '#core/validator'

type Payload = PaginationPayload
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class StorefrontSportPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const query = Sport.query()

      if (payload.search) query.whereILike('name', `%${payload.search}%`)

      const sports = await query
        .orderBy('name', 'asc')
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: sports.getMeta(), data: sports.all() })
    } catch (error) {
      logger.error({ err: error }, '[sports > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'STOREFRONT_SPORT_PAGINATE_ERROR',
        ),
      )
    }
  }
}
