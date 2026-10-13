import MatchService from '#services/match.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MatchStatuses, PAGINATION, type Paginated } from '#core/entity'
import type { StorefrontMatchPaginationPayload } from '#features/storefront/matches/matches.validator'
import type { ModelObject } from '@adonisjs/lucid/types/model'

type Payload = StorefrontMatchPaginationPayload
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class StorefrontMatchPaginateUseCase {
  constructor(private readonly matches: MatchService) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const query = this.matches.schedule(payload)

      // Resultado se lê do mais recente para trás: troca a ordem de agenda do
      // service, em vez de só acrescentar um critério depois dela.
      if (payload.status === MatchStatuses.FINISHED) query.clearOrder().orderBy('updatedAt', 'desc')

      const matches = await query.paginate(
        payload.page ?? PAGINATION.PAGE,
        payload.perPage ?? PAGINATION.PER_PAGE
      )

      return right({ meta: matches.getMeta(), data: matches.all() })
    } catch (error) {
      logger.error({ err: error }, '[storefront matches > list][error]')

      return left(HTTPException.InternalServerError('Erro interno do servidor', 'MATCH_LIST_ERROR'))
    }
  }
}
