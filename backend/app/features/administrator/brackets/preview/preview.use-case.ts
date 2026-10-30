import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorBracketPreviewResponse,
  type Either,
} from '@interclasse/shared'

import { BracketRepository } from '#repositories/bracket/bracket.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorBracketPreviewPayload } from '#validators/administrator/brackets.validator'

type Payload = AdministratorBracketPreviewPayload
type Response = Either<HTTPException, AdministratorBracketPreviewResponse>

/**
 * A prévia do sorteio: as turmas da categoria e quantos atletas cada uma
 * inscreveu na modalidade. Entra quem chegou ao mínimo - a mesma regra do
 * `POST /administrator/brackets`.
 */
@inject()
export default class AdministratorBracketPreviewUseCase {
  constructor(
    private readonly brackets: BracketRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ sportId, category }: Payload): Promise<Response> {
    try {
      const preview = await this.brackets.preview(sportId, category)
      if (!preview)
        return left(
          HTTPException.UnprocessableEntity(
            this.i18n.t('brackets.sport_not_found'),
            'SPORT_NOT_FOUND',
            { sportId: this.i18n.t('brackets.sport_not_found') },
          ),
        )

      return right(preview)
    } catch (error) {
      logger.error({ err: error }, '[administrator/brackets > preview][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_BRACKET_PREVIEW_ERROR',
        ),
      )
    }
  }
}
