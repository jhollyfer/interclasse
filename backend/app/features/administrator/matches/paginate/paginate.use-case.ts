import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type AdministratorMatchPaginateResponse,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import { BracketRepository } from '#repositories/bracket/bracket.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorMatchPaginatePayload } from '#validators/administrator/matches.validator'

type Payload = AdministratorMatchPaginatePayload
type Response = Either<HTTPException, Paginated<AdministratorMatchPaginateResponse>>

/** The match table: the scheduled ones by time first, then those without a time by round. */
@inject()
export default class AdministratorMatchPaginateUseCase {
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
          order: 'schedule',
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[administrator/matches > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_MATCH_PAGINATE_ERROR',
        ),
      )
    }
  }
}
