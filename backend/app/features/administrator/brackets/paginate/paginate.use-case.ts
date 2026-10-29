import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type AdministratorBracketPaginateResponse,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import { BracketRepository } from '#repositories/bracket/bracket.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorBracketPaginatePayload } from '#validators/administrator/brackets.validator'

type Payload = AdministratorBracketPaginatePayload
type Response = Either<HTTPException, Paginated<AdministratorBracketPaginateResponse>>

/** As chaves sorteadas, da mais nova para a mais antiga. */
@inject()
export default class AdministratorBracketPaginateUseCase {
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
          status: payload.status,
          order: 'newest',
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[administrator/brackets > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_BRACKET_PAGINATE_ERROR',
        ),
      )
    }
  }
}
