import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import Storage from '#models/storage'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage-contract.service'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, string>

/**
 * Para onde mandar quem clicou em "salvar arquivo".
 *
 * Existe por uma limitação do navegador, não do storage: o atributo `download`
 * de um `<a>` é **ignorado entre origens**, e a API responde numa origem
 * diferente da do app. Sem esta rota, o clique abriria a imagem numa aba e o
 * arquivo chegaria com o uuid no nome.
 *
 * Devolve uma URL assinada em vez de servir o binário. O `Content-Disposition`
 * com o nome original viaja assinado dentro dela, e é o bucket que o devolve -
 * a aplicação entrega um endereço e sai do caminho, em vez de ficar ocupada
 * pelo tempo da transferência de cada download.
 *
 * Abre por `id` e não por `path` porque o nome original mora na linha de
 * `storages` - é ele que o header carrega.
 *
 * Exige sessão. Era anônima, e com o bucket já privado isso significava que
 * qualquer pessoa com o uuid de um objeto recebia uma URL assinada dele.
 * Fechar o bucket sem fechar esta rota não fechou nada.
 */
@inject()
export default class StoragesFileDownloadUseCase {
  constructor(private readonly storage: StorageContract) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const storage = await Storage.query().where('id', payload.id).first()

      if (!storage)
        return left(HTTPException.NotFound('Arquivo não encontrado', 'STORAGE_NOT_FOUND'))

      return right(await this.storage.signedDownload(storage))
    } catch (error) {
      logger.error({ err: error }, '[files > download][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'FILE_DOWNLOAD_ERROR'),
      )
    }
  }
}
