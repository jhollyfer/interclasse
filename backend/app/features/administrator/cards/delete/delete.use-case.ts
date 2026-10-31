import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import { MatchCardRepository } from '#repositories/match-card/match-card.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/** Deletes the card recorded by mistake. */
@inject()
export default class AdministratorCardDeleteUseCase {
  constructor(
    private readonly cards: MatchCardRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const card = await this.cards.findById(id)
      if (!card)
        return left(HTTPException.NotFound(this.i18n.t('cards.not_found'), 'CARD_NOT_FOUND'))

      await this.cards.delete(card)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[administrator/cards > delete][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_CARD_DELETE_ERROR',
        ),
      )
    }
  }
}
