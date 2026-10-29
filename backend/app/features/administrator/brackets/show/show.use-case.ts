import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import BracketService, { type BracketDetail } from '#services/bracket/bracket.service'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, BracketDetail>

@inject()
export default class AdministratorBracketShowUseCase {
  constructor(private readonly brackets: BracketService) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const detail = await this.brackets.detail(id)

      if (!detail) return left(HTTPException.NotFound('Chave não encontrada', 'BRACKET_NOT_FOUND'))

      return right(detail)
    } catch (error) {
      logger.error({ err: error }, '[brackets > show][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_BRACKET_SHOW_ERROR',
        ),
      )
    }
  }
}
