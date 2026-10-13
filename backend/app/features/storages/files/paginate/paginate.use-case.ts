import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'

import Storage from '#models/storage'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { PAGINATION } from '#core/entity'
import { recentFirst } from '#features/_shared.sort'
import { type Paginated } from '#core/response'
import type { FilePaginatePayload } from '#features/storages/files/files.validator'

type Payload = FilePaginatePayload
type Response = Either<HTTPException, Paginated<ModelObject>>

/**
 * A biblioteca de arquivos do painel.
 *
 * `backend-old` tinha `GET /storage/paginate`, e a tela que a consome
 * (`files/page.tsx`) sobreviveu à migração - sem esta ação ela ficaria sem
 * backend.
 */
@inject()
export default class StoragesFilePaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      // `whereNull` pelo mesmo critério de `StorageService.assertExist`: é o
      // predicado que significa "arquivo vivo" no resto do código. Hoje
      // `remove()` apaga a linha de verdade, então nunca há o que filtrar - mas
      // divergir aqui faria a listagem oferecer um arquivo que o anexo recusa.
      const query = Storage.query().withScopes((scopes) => scopes.notDeleted())

      if (payload.status) query.where('status', payload.status)
      if (payload.mimetype) query.where('mimetype', payload.mimetype)

      // O `OR` vai **dentro** de uma subquery: encadeado direto na consulta ele
      // escapa do `AND` anterior, e a busca anularia o filtro de status -
      // procurar "capa" na aba dos confirmados traria os `PENDING` junto.
      //
      // As três colunas são as de `backend-old`, no de-para desta migração:
      // `original_name` é o rótulo que o usuário reconhece, `filename` é o
      // `name` de lá (o nome gerado, que aparece na URL), e `mimetype` é o que
      // se digita para achar "pdf" sem saber o nome do arquivo.
      if (payload.search) {
        const search = `%${payload.search}%`

        query.where(function (builder) {
          builder
            .whereILike('originalName', search)
            .orWhereILike('filename', search)
            .orWhereILike('mimetype', search)
        })
      }

      const storages = await query
        // `recentFirst` e não `sortOrder`: numa biblioteca de arquivos o que
        // interessa é o que acabou de subir. É a ordem que `backend-old` dava
        // (`storage/repository.ts:37`).
        .orderBy(...recentFirst(payload))
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      // `{ meta, data }` montado à mão: o paginator cru levaria a classe inteira
      // para o tipo da resposta, e `toJSON()` perderia o tipo do item num `any`.
      return right({ meta: storages.getMeta(), data: storages.all() })
    } catch (error) {
      logger.error({ err: error }, '[files > paginate][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'FILE_PAGINATE_ERROR'),
      )
    }
  }
}
