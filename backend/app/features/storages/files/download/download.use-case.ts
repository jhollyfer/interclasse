import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
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
  constructor(
    private readonly bucket: StorageContract,
    private readonly storages: StorageRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const storage = await this.storages.findById(payload.id)

      if (!storage)
        return left(HTTPException.NotFound(this.i18n.t('files.not_found'), 'STORAGE_NOT_FOUND'))

      const { path, mimetype, originalName } = storage.snapshot()

      return right(await this.bucket.signedDownload({ path, mimetype, originalName }))
    } catch (error) {
      logger.error({ err: error }, '[storages/files > download][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STORAGES_FILE_DOWNLOAD_ERROR',
        ),
      )
    }
  }
}
