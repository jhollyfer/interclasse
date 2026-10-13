import { readFile } from 'node:fs/promises'

import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'

import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'

type Response = Either<HTTPException, string>

/**
 * O documento OpenAPI como está no disco.
 *
 * Lido na primeira requisição e mantido em memória: é um artefato gerado por
 * `node ace openapi:generate` e commitado, então em produção ele não muda
 * enquanto o processo vive. Ler por requisição só gastaria I/O.
 */
@inject()
export default class DocumentationOpenapiShowUseCase {
  private static specification: string | undefined

  async execute(): Promise<Response> {
    try {
      if (!DocumentationOpenapiShowUseCase.specification) {
        DocumentationOpenapiShowUseCase.specification = await readFile(
          app.makePath('openapi.json'),
          'utf-8',
        )
      }

      return right(DocumentationOpenapiShowUseCase.specification)
    } catch (error) {
      logger.error({ err: error }, '[openapi > show][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'OPENAPI_SHOW_ERROR'),
      )
    }
  }
}
