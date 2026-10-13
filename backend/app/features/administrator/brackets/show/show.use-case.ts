import BracketService, { type BracketDetail } from '#services/bracket/bracket.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
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
        HTTPException.InternalServerError('Erro interno do servidor', 'BRACKET_SHOW_ERROR')
      )
    }
  }
}
