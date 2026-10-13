import Storage from '#models/storage'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, Storage>

@inject()
export default class StorageShowUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      // O mesmo filtro da listagem, pelo mesmo motivo: é o predicado que
      // significa "arquivo vivo" em `StorageService.assertExist`, e divergir
      // aqui mostraria na tela de detalhe um arquivo que o anexo recusa.
      const storage = await Storage.query()
        .where('id', id)
        .withScopes((scopes) => scopes.notDeleted())
        .first()

      if (!storage)
        return left(HTTPException.NotFound('Arquivo não encontrado', 'STORAGE_NOT_FOUND'))

      return right(storage)
    } catch (error) {
      logger.error({ err: error }, '[storages > show][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'STORAGE_SHOW_ERROR')
      )
    }
  }
}
