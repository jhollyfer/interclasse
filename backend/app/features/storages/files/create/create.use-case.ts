import { randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either, type StoragesFileUploadResponse } from '@interclasse/shared'

import { FilePresenter } from '../files.presenter.ts'

import { Storage } from '#domain/storage/storage.entity'
import HTTPException from '#exceptions/http.exception'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import {
  MultipartContract,
  PART_SIZE,
  PRESIGNED_BATCH,
  type PresignedPart,
} from '#services/multipart/multipart.contract'
import { countParts, pendingParts, sizedParts } from '#features/storages/_shared.parts'
import type { StoragesFileCreatePayload } from '#validators/storages/files.validator'

type Payload = StoragesFileCreatePayload
type Response = Either<HTTPException, StoragesFileUploadResponse>

/**
 * Abre um upload: registra o arquivo como `PENDING` e devolve por onde subi-lo.
 *
 * **Não recebe bytes**. O binário vai do navegador direto ao bucket,
 * por URL assinada, e nunca atravessa esta aplicação. Não é preferência de
 * estilo: um arquivo grande num corpo HTTP esbarra no limite do proxy antes de
 * chegar aqui, ocupa a aplicação inteira pelo tempo do upload, e não tem como
 * ser retomado quando a conexão cai no meio.
 *
 * Tipo e tamanho são **declarados** pelo cliente e recusados no validator antes
 * de qualquer assinatura - arquivo proibido não ganha URL, então não chega ao
 * bucket. Que o declarado seja verdade é o que `POST /storages/:id/complete`
 * confere, contra o objeto real.
 *
 * Arquivo menor que uma parte não vira multipart: ganha uma URL só, `uploadId`
 * nulo e um `PUT` direto. `UploadId`, coleta de `ETag` e confirmação em duas
 * etapas para um avatar de 40 KB seriam cerimônia sem função.
 *
 * O arquivo nasce sem dono: quem anexa é que guarda o id.
 */
@inject()
export default class StoragesFileCreateUseCase {
  constructor(
    private readonly bucket: StorageContract,
    private readonly multipart: MultipartContract,
    private readonly storages: StorageRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    const key = this.bucket.key(payload.mimetype)
    const totalParts = countParts(payload.size, PART_SIZE)

    let uploadId: string | null = null
    let parts: Array<PresignedPart> = []

    try {
      if (totalParts <= 1) {
        parts = [
          {
            partNumber: 1,
            url: await this.multipart.signSingle(key, payload.mimetype, payload.size),
          },
        ]
      }

      if (totalParts > 1) {
        uploadId = await this.multipart.initiate(key, payload.mimetype)
        parts = await this.multipart.signParts(
          key,
          uploadId,
          sizedParts(
            pendingParts({ totalParts, uploaded: [], batch: PRESIGNED_BATCH }),
            payload.size,
            PART_SIZE,
          ),
        )
      }

      const storage = Storage.open({
        id: randomUUID(),
        key,
        originalName: payload.fileName,
        mimetype: payload.mimetype,
        size: payload.size,
        uploadId,
        partSize: PART_SIZE,
        now: new Date(),
      })

      await this.storages.save(storage)

      return right(
        FilePresenter.upload({
          storage,
          uploadId,
          partSize: PART_SIZE,
          totalParts,
          parts,
          uploaded: [],
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[storages/files > create][error]')

      // O multipart pode ter sido aberto antes de a linha falhar. Sem este
      // aborto ele fica pendurado no bucket para sempre: partes órfãs não
      // aparecem na listagem de objetos e continuam sendo cobradas.
      if (uploadId) await this.abortQuietly(key, uploadId)

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STORAGES_FILE_CREATE_ERROR',
        ),
      )
    }
  }

  /**
   * Aborta sem deixar a falha do aborto encobrir a falha original - quem chama
   * já está no caminho do erro, e o que interessa reportar é o primeiro.
   */
  private async abortQuietly(key: string, uploadId: string): Promise<void> {
    try {
      await this.multipart.abort(key, uploadId)
    } catch (error) {
      logger.error({ err: error }, '[storages/files > create][abort][error]')
    }
  }
}
