import Sport from '#models/sport'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { PAGINATION, sortOrder, type Paginated } from '#core/entity'
import type { AdministratorSportPaginationPayload } from '#features/administrator/sports/sports.validator'
import type { ModelObject } from '@adonisjs/lucid/types/model'

type Payload = AdministratorSportPaginationPayload
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class AdministratorSportPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const query = Sport.query()

      if (payload.search) query.whereILike('name', `%${payload.search}%`)

      const sports = await query
        .orderBy(...sortOrder(payload, 'name'))
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: sports.getMeta(), data: sports.all() })
    } catch (error) {
      logger.error({ err: error }, '[sports > list][error]')

      return left(HTTPException.InternalServerError('Erro interno do servidor', 'SPORT_LIST_ERROR'))
    }
  }
}
