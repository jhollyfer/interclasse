import Storage from '#models/storage'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import StorageService from '#services/storage.service'
import MultipartService, {
  countParts,
  pendingParts,
  PART_SIZE,
  type PresignedPart,
  type UploadedPart,
} from '#services/multipart.service'
import { UploadStatuses } from '#core/entity'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { IdentifierPayload } from '#core/validator'
import type { StorageUpload } from './create.use-case.ts'

type Payload = IdentifierPayload
type Response = Either<HTTPException, StorageUpload>

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
export default class StoragePartsUseCase {
  constructor(
    private readonly storage: StorageService,
    private readonly multipart: MultipartService
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const storage = await Storage.query().where('id', payload.id).first()

      if (!storage)
        return left(HTTPException.NotFound('Arquivo não encontrado', 'STORAGE_NOT_FOUND'))

      const partSize = storage.partSize ?? PART_SIZE
      const totalParts = countParts(storage.size, partSize)

      // Já confirmado: nada a subir. Devolver a mesma forma com as listas
      // vazias, e não um erro, porque quem pergunta é um cliente retomando -
      // ele lê o `status` e para, que é o desfecho certo.
      if (storage.status === UploadStatuses.UPLOADED) {
        return right(this.#envelope(storage, partSize, totalParts, [], []))
      }

      const uploaded = await this.#uploaded(storage)
      const missing = pendingParts(
        totalParts,
        uploaded.map((part) => part.partNumber)
      )
      const parts = await this.#sign(storage, missing)

      return right(this.#envelope(storage, partSize, totalParts, parts, uploaded))
    } catch (error) {
      logger.error({ err: error }, '[storages > parts][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'STORAGE_PARTS_ERROR')
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
  async #uploaded(storage: Storage): Promise<Array<UploadedPart>> {
    if (storage.uploadId) return this.multipart.listParts(storage.path, storage.uploadId)

    try {
      const metadata = await this.storage.metadata(storage)

      return [{ partNumber: 1, size: metadata.contentLength, etag: metadata.etag ?? '' }]
    } catch {
      // Objeto ainda não existe no bucket: nada enviado, nada a retomar.
      return []
    }
  }

  /** URL nova para cada parte que falta - as antigas podem ter expirado. */
  async #sign(storage: Storage, missing: Array<number>): Promise<Array<PresignedPart>> {
    if (missing.length === 0) return []

    if (storage.uploadId) {
      return this.multipart.signParts(storage.path, storage.uploadId, missing)
    }

    return [{ partNumber: 1, url: await this.multipart.signSingle(storage.path, storage.mimetype) }]
  }

  #envelope(
    storage: Storage,
    partSize: number,
    totalParts: number,
    parts: Array<PresignedPart>,
    uploaded: Array<UploadedPart>
  ): StorageUpload {
    return {
      storage,
      uploadId: storage.uploadId,
      partSize,
      totalParts,
      parts,
      uploaded,
    }
  }
}
