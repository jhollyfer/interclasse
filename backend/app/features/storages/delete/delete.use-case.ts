import Storage from '#models/storage'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import StorageService from '#services/storage/storage.service'
import MultipartService from '#services/multipart/multipart.service'
import { UploadStatuses } from '#core/entity'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
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
 * pronto, e aí vale a regra de referência abaixo.
 *
 * **Só apaga o que ninguém usa.** `storages` é registro neutro e compartilhado
 * - o arquivo não pertence ao formulário que o enviou -, então a posse não
 * serve de autorização: quem conhecesse um uuid furaria a capa de uma notícia
 * alheia. Referenciado é `409`, e a mensagem diz onde.
 */
@inject()
export default class StorageDeleteUseCase {
  constructor(
    private readonly storage: StorageService,
    private readonly multipart: MultipartService
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const storage = await Storage.query().where('id', payload.id).first()

      if (!storage)
        return left(HTTPException.NotFound('Arquivo não encontrado', 'STORAGE_NOT_FOUND'))

      if (storage.status === UploadStatuses.PENDING) {
        await this.#cancel(storage)

        return right(null)
      }

      const references = await this.storage.references(storage.id)

      if (references.length > 0)
        return left(
          HTTPException.Conflict('Arquivo em uso', 'STORAGE_IN_USE', {
            id: `Arquivo em uso em: ${references.join(', ')}. Desvincule-o antes de apagá-lo.`,
          })
        )

      await this.storage.remove(storage)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[storages > delete][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'STORAGE_DELETE_ERROR')
      )
    }
  }

  /**
   * Cancela um upload em andamento.
   *
   * Não passa pela regra de referência porque um `PENDING` não tem como estar
   * referenciado: `assertExist` recusa anexar o que não está `UPLOADED`.
   *
   * O objeto final não existe ainda - as partes vivem sob o `uploadId`, e é o
   * aborto que as descarta. No upload de parte única não há aborto, e o que
   * pode existir é o objeto inteiro, quando o `PUT` chegou a completar antes do
   * cancelamento; apagá-lo pode não encontrar nada, e não encontrar é o caso
   * comum.
   */
  async #cancel(storage: Storage): Promise<void> {
    if (storage.uploadId) {
      await this.multipart.abort(storage.path, storage.uploadId)
    }

    if (!storage.uploadId) {
      try {
        await this.storage.discard(storage)
      } catch {
        // Não encontrar o objeto é o caso comum, e é o resultado que se queria.
      }
    }

    await storage.delete()
  }
}
