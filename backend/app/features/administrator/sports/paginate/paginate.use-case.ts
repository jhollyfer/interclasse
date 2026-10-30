import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  SORT_DIRECTION,
  left,
  right,
  type AdministratorSportShowResponse,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import { SportRepository } from '#repositories/sport/sport.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorSportPaginatePayload } from '#validators/administrator/sports.validator'

type Payload = AdministratorSportPaginatePayload
type Response = Either<HTTPException, Paginated<AdministratorSportShowResponse>>

@inject()
export default class AdministratorSportPaginateUseCase {
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
          sort: payload.sort ?? 'name',
          direction: payload.direction ?? SORT_DIRECTION.ASC,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[administrator/sports > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_SPORT_PAGINATE_ERROR',
        ),
      )
    }
  }
}
