import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either, type StoragesFileUploadResponse } from '@interclasse/shared'

import { FilePresenter } from '../files.presenter.ts'

import type { Storage } from '#domain/storage/storage.entity'
import HTTPException from '#exceptions/http.exception'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import {
  MultipartContract,
  PART_SIZE,
  type PresignedPart,
  type UploadedPart,
} from '#services/multipart/multipart.contract'
import { countParts, pendingParts } from '#features/storages/_shared.parts'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, StoragesFileUploadResponse>

/**
 * De onde continuar: o que o bucket já recebeu, e URL nova para o que falta.
 *
 * Um endpoint só para dois casos que são o mesmo problema:
 *
 * - **retomada.** A conexão caiu na parte 900 de mil. Sem isto, a única saída
 *   seria recomeçar do zero - e recomeçar do zero num arquivo grande é o que
 *   torna a rede ruim intransponível em vez de só lenta.
 * - **próximo lote.** As URLs saem em lotes (`PRESIGNED_BATCH`), porque assinar
 *   mil de uma vez seria meio megabyte de JSON antes do primeiro byte subir.
 *   Quem terminou o lote pede o seguinte aqui.
 *
 * Assinar de novo é o ponto, e não um efeito colateral: URL assinada expira, e
 * um upload que durou mais que a validade encontra aqui um endereço novo para a
 * mesma parte. É por isso que a resposta reassina em vez de devolver as URLs
 * originais.
 */
@inject()
export default class StoragesFilePartsUseCase {
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

      const file = storage.snapshot()
      const partSize = file.partSize ?? PART_SIZE
      const totalParts = countParts(file.size, partSize)
      const url = await this.bucket.signedUrl(file.path)

      // Já confirmado: nada a subir. Devolver a mesma forma com as listas
      // vazias, e não um erro, porque quem pergunta é um cliente retomando -
      // ele lê o `status` e para, que é o desfecho certo.
      if (storage.isUploaded()) {
        return right(
          FilePresenter.upload({
            storage,
            url,
            uploadId: file.uploadId,
            partSize,
            totalParts,
            parts: [],
            uploaded: [],
          }),
        )
      }

      const uploaded = await this.uploaded(storage)
      const missing = pendingParts(
        totalParts,
        uploaded.map((part) => part.partNumber),
      )
      const parts = await this.sign(storage, missing)

      return right(
        FilePresenter.upload({
          storage,
          url,
          uploadId: file.uploadId,
          partSize,
          totalParts,
          parts,
          uploaded,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[storages/files > parts][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STORAGES_FILE_PARTS_ERROR',
        ),
      )
    }
  }

  /**
   * O que o bucket já tem.
   *
   * No multipart é o `ListParts`. No upload de parte única não há partes para
   * listar, e o que responde a mesma pergunta é o próprio objeto existir: se o
   * `PUT` chegou a completar, o arquivo está lá e só falta confirmar.
   */
  private async uploaded(storage: Storage): Promise<Array<UploadedPart>> {
    const { path, uploadId } = storage.snapshot()

    if (uploadId) return this.multipart.listParts(path, uploadId)

    try {
      const metadata = await this.bucket.metadata(path)

      return [{ partNumber: 1, size: metadata.contentLength, etag: metadata.etag ?? '' }]
    } catch {
      // Objeto ainda não existe no bucket: nada enviado, nada a retomar.
      return []
    }
  }

  /** URL nova para cada parte que falta - as antigas podem ter expirado. */
  private async sign(storage: Storage, missing: Array<number>): Promise<Array<PresignedPart>> {
    if (missing.length === 0) return []

    const { path, uploadId, mimetype } = storage.snapshot()

    if (uploadId) return this.multipart.signParts(path, uploadId, missing)

    return [{ partNumber: 1, url: await this.multipart.signSingle(path, mimetype) }]
  }
}
