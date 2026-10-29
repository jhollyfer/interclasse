import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'
import { PAGINATION, left, right, type Either, type Paginated } from '@interclasse/shared'

import CardService from '#services/card/card.service'
import HTTPException from '#exceptions/http.exception'
import type { CardPaginatePayload } from '#validators/administrator/cards.validator'

type Payload = CardPaginatePayload
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class AdministratorCardPaginateUseCase {
  constructor(private readonly cards: CardService) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const cards = await this.cards
        .list(payload)
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: cards.getMeta(), data: cards.all() })
    } catch (error) {
      logger.error({ err: error }, '[cards > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_CARD_PAGINATE_ERROR',
        ),
      )
    }
  }
}
