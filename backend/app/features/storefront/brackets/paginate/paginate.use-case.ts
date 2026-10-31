import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type Either,
  type Paginated,
  type StorefrontBracketPaginateResponse,
} from '@interclasse/shared'

import { BracketRepository } from '#repositories/bracket/bracket.repository'
import HTTPException from '#exceptions/http.exception'
import type { StorefrontBracketPaginatePayload } from '#validators/storefront/brackets.validator'

type Payload = StorefrontBracketPaginatePayload
type Response = Either<HTTPException, Paginated<StorefrontBracketPaginateResponse>>

@inject()
export default class StorefrontBracketPaginateUseCase {
  constructor(
    private readonly brackets: BracketRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      return right(
        await this.brackets.paginate({
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
          sportId: payload.sportId,
          category: payload.category,
          // By sport and category: it is how the site groups the tabs.
          order: 'sport-name',
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[storefront/brackets > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STOREFRONT_BRACKET_PAGINATE_ERROR',
        ),
      )
    }
  }
}
