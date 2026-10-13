import Bracket from '#models/bracket'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { PAGINATION, type Paginated } from '#core/entity'
import type { AdministratorBracketPaginationPayload } from '#features/administrator/brackets/brackets.validator'
import type { ModelObject } from '@adonisjs/lucid/types/model'

type Payload = AdministratorBracketPaginationPayload
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
      logger.error({ err: error }, '[brackets > list][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'BRACKET_LIST_ERROR')
      )
    }
  }
}
