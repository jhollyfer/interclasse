import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  MATCH_STATUS,
  PAGINATION,
  left,
  right,
  type Either,
  type Paginated,
  type StorefrontMatchPaginateResponse,
} from '@interclasse/shared'

import { BracketRepository, type MatchListOrder } from '#repositories/bracket/bracket.repository'
import HTTPException from '#exceptions/http.exception'
import type { StorefrontMatchPaginatePayload } from '#validators/storefront/matches.validator'

type Payload = StorefrontMatchPaginatePayload
type Response = Either<HTTPException, Paginated<StorefrontMatchPaginateResponse>>

@inject()
export default class StorefrontMatchPaginateUseCase {
  constructor(
    private readonly brackets: BracketRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      return right(
        await this.brackets.paginateMatches({
          ...payload,
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
          order: this.orderFor(payload),
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[storefront/matches > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STOREFRONT_MATCH_PAGINATE_ERROR',
        ),
      )
    }
  }

  /** Resultado se lê do mais recente para trás; o resto, na ordem da agenda. */
  private orderFor(payload: Payload): MatchListOrder {
    if (payload.status === MATCH_STATUS.FINISHED) return 'recent-results'

    return 'schedule'
  }
}
