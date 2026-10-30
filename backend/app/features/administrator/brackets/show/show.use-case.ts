import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorBracketShowResponse,
  type Either,
} from '@interclasse/shared'

import { BracketRepository } from '#repositories/bracket/bracket.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, AdministratorBracketShowResponse>

@inject()
export default class AdministratorBracketShowUseCase {
  constructor(
    private readonly brackets: BracketRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const detail = await this.brackets.detail(id)
      if (!detail)
        return left(HTTPException.NotFound(this.i18n.t('brackets.not_found'), 'BRACKET_NOT_FOUND'))

      return right(detail)
    } catch (error) {
      logger.error({ err: error }, '[administrator/brackets > show][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_BRACKET_SHOW_ERROR',
        ),
      )
    }
  }
}
