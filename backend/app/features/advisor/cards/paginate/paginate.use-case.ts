import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type AdvisorCardPaginateResponse,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import { MatchCardRepository } from '#repositories/match-card/match-card.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdvisorCardPaginatePayload } from '#validators/advisor/cards.validator'

type Payload = AdvisorCardPaginatePayload
type Response = Either<HTTPException, Paginated<AdvisorCardPaginateResponse>>

/**
 * Os cartões que os atletas da turma levaram, do mais novo ao mais antigo. Que a
 * turma é do conselheiro (404 para a alheia) o controller confere na policy
 * antes de chegar aqui.
 */
@inject()
export default class AdvisorCardPaginateUseCase {
  constructor(
    private readonly cards: MatchCardRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      return right(
        await this.cards.paginate({
          classroomId: payload.classroomId,
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[advisor/cards > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADVISOR_CARD_PAGINATE_ERROR',
        ),
      )
    }
  }
}
