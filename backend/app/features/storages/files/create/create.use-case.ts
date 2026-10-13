import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'

import Storage from '#models/storage'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage-contract.service'
import {
  MultipartContract,
  PART_SIZE,
  type PresignedPart,
} from '#services/multipart/multipart-contract.service'
import { countParts, pendingParts } from '#features/storages/_shared.parts'
import { UploadStatuses } from '#core/entity'
import type { FileCreatePayload } from '#features/storages/files/files.validator'

type Payload = FileCreatePayload

/**
 * O que o cliente precisa para subir o arquivo por conta própria.
 *
 * É a mesma forma que `GET /storages/:id/parts` devolve, de propósito: começar
 * um upload e retomá-lo são a mesma pergunta - "para onde eu mando o quê" -, e
 * duas formas para a mesma resposta seriam dois caminhos no cliente.
 */
export type StorageUpload = {
  storage: ModelObject
  uploadId: string | null
  partSize: number
  totalParts: number
  /** As URLs deste lote. Pode ser menos que `totalParts` (ver `PRESIGNED_BATCH`). */
  parts: Array<PresignedPart>
  /** As partes que o bucket já tem. Sempre vazio ao iniciar. */
  uploaded: Array<{ partNumber: number; size: number; etag: string }>
}

type Response = Either<HTTPException, StorageUpload>

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
    private readonly storage: StorageContract,
    private readonly multipart: MultipartContract,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    const key = this.storage.key(payload.mimetype)
    const totalParts = countParts(payload.size, PART_SIZE)

    let uploadId: string | null = null
    let parts: Array<PresignedPart> = []

    try {
      if (totalParts <= 1) {
        parts = [{ partNumber: 1, url: await this.multipart.signSingle(key, payload.mimetype) }]
      }

      if (totalParts > 1) {
        uploadId = await this.multipart.initiate(key, payload.mimetype)
        parts = await this.multipart.signParts(key, uploadId, pendingParts(totalParts, []))
      }

      const storage = new Storage()

      storage.merge({
        filename: key,
        originalName: payload.fileName,
        mimetype: payload.mimetype,
        size: payload.size,
        path: key,
        status: UploadStatuses.PENDING,
        uploadId,
        partSize: PART_SIZE,
      })

      await storage.save()

      return right({
        storage,
        uploadId,
        partSize: PART_SIZE,
        totalParts,
        parts,
        uploaded: [],
      })
    } catch (error) {
      logger.error({ err: error }, '[files > create][error]')

      // O multipart pode ter sido aberto antes de a linha falhar. Sem este
      // aborto ele fica pendurado no bucket para sempre: partes órfãs não
      // aparecem na listagem de objetos e continuam sendo cobradas.
      if (uploadId) await this.#abortQuietly(key, uploadId)

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'FILE_CREATE_ERROR'),
      )
    }
  }

  /**
   * Aborta sem deixar a falha do aborto encobrir a falha original - quem chama
   * já está no caminho do erro, e o que interessa reportar é o primeiro.
   */
  async #abortQuietly(key: string, uploadId: string): Promise<void> {
    try {
      await this.multipart.abort(key, uploadId)
    } catch (error) {
      logger.error({ err: error }, '[files > create][abort][error]')
    }
  }
}
