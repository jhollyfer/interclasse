import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'
import {
  MATCH_STATUS,
  PAGINATION,
  left,
  right,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import MatchService from '#services/match/match.service'
import HTTPException from '#exceptions/http.exception'
import type { MatchPaginatePayload } from '#validators/storefront/matches.validator'

type Payload = MatchPaginatePayload
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class StorefrontMatchPaginateUseCase {
  constructor(private readonly matches: MatchService) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const query = this.matches.schedule(payload)

      // Resultado se lê do mais recente para trás: troca a ordem de agenda do
      // service, em vez de só acrescentar um critério depois dela.
      if (payload.status === MATCH_STATUS.FINISHED) query.clearOrder().orderBy('updatedAt', 'desc')

      const matches = await query.paginate(
        payload.page ?? PAGINATION.PAGE,
        payload.perPage ?? PAGINATION.PER_PAGE,
      )

      return right({ meta: matches.getMeta(), data: matches.all() })
    } catch (error) {
      logger.error({ err: error }, '[matches > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'STOREFRONT_MATCH_PAGINATE_ERROR',
        ),
      )
    }
  }
}
