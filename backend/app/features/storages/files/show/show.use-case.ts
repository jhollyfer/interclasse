import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either, type StoragesFileShowResponse } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { StorageRepository } from '#repositories/storage/storage.repository'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, StoragesFileShowResponse>

@inject()
export default class StoragesFileShowUseCase {
  constructor(
    private readonly storages: StorageRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      // Só o arquivo vivo, o mesmo predicado de quem anexa: divergir aqui
      // mostraria na tela de detalhe um arquivo que o anexo recusa.
      const storage = await this.storages.detail(id)

      if (!storage)
        return left(HTTPException.NotFound(this.i18n.t('files.not_found'), 'STORAGE_NOT_FOUND'))

      return right(storage)
    } catch (error) {
      logger.error({ err: error }, '[storages/files > show][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STORAGES_FILE_SHOW_ERROR',
        ),
      )
    }
  }
}
