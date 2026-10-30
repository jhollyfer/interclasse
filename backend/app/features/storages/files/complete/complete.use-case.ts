import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type Merge,
  type StoragesFileShowResponse,
} from '@interclasse/shared'

import { FileRefusal } from '../_shared.file-refusal.ts'

import type { Storage } from '#domain/storage/storage.entity'
import HTTPException from '#exceptions/http.exception'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import { MultipartContract } from '#services/multipart/multipart.contract'
import type { IdentifierPayload } from '#core/validator'
import type { StoragesFileCompletePayload } from '#validators/storages/files.validator'

type Payload = Merge<IdentifierPayload, StoragesFileCompletePayload>
type Response = Either<HTTPException, StoragesFileShowResponse>

/**
 * Fecha o upload: remonta as partes no bucket e marca a linha como `UPLOADED`.
 *
 * É aqui que o "declarado" vira "conferido". O `POST /storages` acreditou no
 * tamanho que o cliente informou - não tinha como não acreditar, já que os
 * bytes não passam por aqui -, e é este endpoint que compara o que
 * **de fato** subiu com o que foi prometido (regra da entidade). Divergiu: o
 * objeto é apagado, a linha morre junto, e a resposta é `422`.
 *
 * O `mimetype` não é conferido porque não tem como divergir: ele entra na
 * assinatura da URL, e o bucket recusa um `PUT` cujo `Content-Type` não bata
 * com o que foi assinado. O tamanho, esse não entra - e por isso é o que se
 * confere.
 *
 * Chamar duas vezes é seguro. Um cliente que perdeu a resposta por queda de
 * rede reenvia a confirmação, e a segunda devolve o mesmo registro em vez de
 * um erro de "upload já fechado" que não ajudaria ninguém.
 */
@inject()
export default class StoragesFileCompleteUseCase {
  constructor(
    private readonly bucket: StorageContract,
    private readonly multipart: MultipartContract,
    private readonly storages: StorageRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const storage = await this.storages.findById(payload.id)

      if (!storage) return left(this.notFound())

      if (!storage.isUploaded()) {
        const { path, uploadId } = storage.snapshot()

        if (uploadId) await this.multipart.complete(path, uploadId, payload.parts ?? [])

        const metadata = await this.bucket.metadata(path)
        const head = await this.bucket.head(path)
        const completed = storage.complete(
          { contentLength: metadata.contentLength, head },
          new Date(),
        )

        if (completed.isLeft()) {
          await this.discard(storage)

          return left(FileRefusal.http(completed.value, this.i18n))
        }

        await this.storages.save(storage)
      }

      const detail = await this.storages.detail(storage.id)

      if (!detail) return left(this.notFound())

      return right(await this.bucket.withUrl(detail))
    } catch (error) {
      logger.error({ err: error }, '[storages/files > complete][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STORAGES_FILE_COMPLETE_ERROR',
        ),
      )
    }
  }

  /**
   * Apaga o que subiu errado, binário e linha.
   *
   * A linha morre junto porque ela não descreve mais nada: um `PENDING` cujo
   * objeto foi apagado nunca vai poder ser confirmado, e ficaria para sempre
   * ocupando um id que alguém poderia tentar anexar.
   */
  private async discard(storage: Storage): Promise<void> {
    try {
      await this.bucket.discard(storage.snapshot().path)
      await this.storages.delete(storage)
    } catch (error) {
      logger.error({ err: error }, '[storages/files > complete][discard][error]')
    }
  }

  private notFound(): HTTPException {
    return HTTPException.NotFound(this.i18n.t('files.not_found'), 'STORAGE_NOT_FOUND')
  }
}
