import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  SORT_DIRECTION,
  left,
  right,
  type Either,
  type Paginated,
  type StorefrontSportShowResponse,
} from '@interclasse/shared'

import { SportRepository } from '#repositories/sport/sport.repository'
import HTTPException from '#exceptions/http.exception'
import type { PaginationPayload } from '#core/validator'

type Payload = PaginationPayload
type Response = Either<HTTPException, Paginated<StorefrontSportShowResponse>>

/** As modalidades do site, em ordem de nome. */
@inject()
export default class StorefrontSportPaginateUseCase {
  constructor(
    private readonly sports: SportRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      return right(
        await this.sports.paginate({
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
          search: payload.search,
          sort: 'name',
          direction: SORT_DIRECTION.ASC,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[storefront/sports > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STOREFRONT_SPORT_PAGINATE_ERROR',
        ),
      )
    }
  }
}
