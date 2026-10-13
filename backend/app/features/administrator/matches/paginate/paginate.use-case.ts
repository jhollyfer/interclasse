import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'

import MatchService from '#services/match/match.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { PAGINATION, type Paginated } from '#core/entity'
import type { MatchPaginatePayload } from '#features/administrator/matches/matches.validator'

type Payload = MatchPaginatePayload
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
      logger.error({ err: error }, '[matches > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_MATCH_PAGINATE_ERROR',
        ),
      )
    }
  }
}
