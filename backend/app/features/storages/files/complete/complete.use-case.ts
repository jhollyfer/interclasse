import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'

import Storage from '#models/storage'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage-contract.service'
import { MultipartContract } from '#services/multipart/multipart-contract.service'
import { UPLOAD_STATUS } from '#core/entity'
import type { Merge } from '#core/entity'
import type { IdentifierPayload } from '#core/validator'
import type { FileCompletePayload } from '#features/storages/files/files.validator'

type Payload = Merge<IdentifierPayload, FileCompletePayload>
type Response = Either<HTTPException, ModelObject>

/**
 * Fecha o upload: remonta as partes no bucket e marca a linha como `UPLOADED`.
 *
 * É aqui que o "declarado" vira "conferido". O `POST /storages` acreditou no
 * tamanho que o cliente informou - não tinha como não acreditar, já que os
 * bytes não passam por aqui -, e é este endpoint que compara o que
 * **de fato** subiu com o que foi prometido. Divergiu: o objeto é apagado, a
 * linha morre junto, e a resposta é `422`.
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
    private readonly storage: StorageContract,
    private readonly multipart: MultipartContract,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const storage = await Storage.query().where('id', payload.id).first()

      if (!storage)
        return left(HTTPException.NotFound('Arquivo não encontrado', 'STORAGE_NOT_FOUND'))

      if (storage.status === UPLOAD_STATUS.UPLOADED) return right(storage)

      if (storage.uploadId) {
        await this.multipart.complete(storage.path, storage.uploadId, payload.parts ?? [])
      }

      const metadata = await this.storage.metadata(storage)

      if (metadata.contentLength !== storage.size) {
        await this.#discard(storage)

        return left(
          HTTPException.UnprocessableEntity('Arquivo incompleto', 'STORAGE_SIZE_MISMATCH', {
            size: `O arquivo enviado tem ${metadata.contentLength} bytes, e ${storage.size} foram declarados.`,
          }),
        )
      }

      storage.status = UPLOAD_STATUS.UPLOADED
      // O upload acabou: guardar o identificador dele só manteria vivo um
      // ponteiro para uma conversa que o bucket já encerrou.
      storage.uploadId = null

      await storage.save()

      return right(storage)
    } catch (error) {
      logger.error({ err: error }, '[files > complete][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'FILE_COMPLETE_ERROR'),
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
  async #discard(storage: Storage): Promise<void> {
    try {
      await this.storage.remove(storage)
    } catch (error) {
      logger.error({ err: error }, '[files > complete][discard][error]')
    }
  }
}
