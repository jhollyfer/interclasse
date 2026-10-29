import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import { FileRefusal } from '../_shared.file-refusal.ts'

import type { Storage } from '#domain/storage/storage.entity'
import HTTPException from '#exceptions/http.exception'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import { MultipartContract } from '#services/multipart/multipart.contract'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Apaga um arquivo órfão: o binário no bucket e a linha em `storages`.
 *
 * Existe para fechar o buraco que o upload abre. O `POST /storages` registra o
 * arquivo **antes** de o formulário ser salvo (é o que evita um payload que
 * referencia um arquivo que falhou ao subir), então todo anexo escolhido e
 * depois removido da tela ficaria no bucket para sempre.
 *
 * Serve aos dois estados. `PENDING` é upload em andamento, e apagá-lo é
 * **cancelar**: o multipart é abortado, e é isso que faz as partes já enviadas
 * sumirem. Sem o aborto elas ficam penduradas para sempre - não aparecem na
 * listagem de objetos, e continuam sendo cobradas. `UPLOADED` é o arquivo
 * pronto, e aí vale a regra de referência da entidade.
 *
 * **Só apaga o que ninguém usa.** `storages` é registro neutro e compartilhado
 * - o arquivo não pertence ao formulário que o enviou -, então a posse não
 * serve de autorização: quem conhecesse um uuid furaria a capa de uma notícia
 * alheia. Referenciado é `409`, e a mensagem diz onde.
 */
@inject()
export default class StoragesFileDeleteUseCase {
  constructor(
    private readonly bucket: StorageContract,
    private readonly multipart: MultipartContract,
    private readonly storages: StorageRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const storage = await this.storages.findById(payload.id)

      if (!storage)
        return left(HTTPException.NotFound(this.i18n.t('files.not_found'), 'STORAGE_NOT_FOUND'))

      const removable = storage.remove(await this.storages.usedBy(storage.id))

      if (removable.isLeft()) return left(FileRefusal.http(removable.value, this.i18n))

      if (storage.isPending()) await this.cancel(storage)
      else await this.bucket.discard(storage.snapshot().path)

      await this.storages.delete(storage)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[files > delete][error]')

      return left(
        HTTPException.InternalServerError(this.i18n.t('errors.internal'), 'FILE_DELETE_ERROR'),
      )
    }
  }

  /**
   * Cancela um upload em andamento.
   *
   * O objeto final não existe ainda - as partes vivem sob o `uploadId`, e é o
   * aborto que as descarta. No upload de parte única não há aborto, e o que
   * pode existir é o objeto inteiro, quando o `PUT` chegou a completar antes do
   * cancelamento; apagá-lo pode não encontrar nada, e não encontrar é o caso
   * comum.
   */
  private async cancel(storage: Storage): Promise<void> {
    const { path, uploadId } = storage.snapshot()

    if (uploadId) {
      await this.multipart.abort(path, uploadId)
      return
    }

    try {
      await this.bucket.discard(path)
    } catch {
      // Não encontrar o objeto é o caso comum, e é o resultado que se queria.
    }
  }
}
