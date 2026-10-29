import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type AdministratorCardPaginateResponse,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import { MatchCardRepository } from '#repositories/match-card/match-card.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorCardPaginatePayload } from '#validators/administrator/cards.validator'

type Payload = AdministratorCardPaginatePayload
type Response = Either<HTTPException, Paginated<AdministratorCardPaginateResponse>>

/** Os cartões lançados, do mais novo ao mais antigo. */
@inject()
export default class AdministratorCardPaginateUseCase {
  constructor(
    private readonly cards: MatchCardRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      return right(
        await this.cards.paginate({
          ...payload,
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[administrator/cards > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_CARD_PAGINATE_ERROR',
        ),
      )
    }
  }
}
