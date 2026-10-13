import MatchService from '#services/match.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { PAGINATION, type Paginated } from '#core/entity'
import type { AdministratorMatchPaginationPayload } from '#core/validator'
import type { ModelObject } from '@adonisjs/lucid/types/model'

type Payload = AdministratorMatchPaginationPayload
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class AdministratorMatchPaginateUseCase {
  constructor(private readonly matches: MatchService) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const matches = await this.matches
        .schedule(payload)
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: matches.getMeta(), data: matches.all() })
    } catch (error) {
      logger.error({ err: error }, '[matches > list][error]')

      return left(HTTPException.InternalServerError('Erro interno do servidor', 'MATCH_LIST_ERROR'))
    }
  }
}
