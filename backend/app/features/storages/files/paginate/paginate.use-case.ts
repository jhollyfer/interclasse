import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type Either,
  type Paginated,
  type StoragesFileShowResponse,
} from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage.contract'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { recentFirst } from '#features/_shared.sort'
import type { StoragesFilePaginatePayload } from '#validators/storages/files.validator'

type Payload = StoragesFilePaginatePayload
type Response = Either<HTTPException, Paginated<StoragesFileShowResponse>>

/**
 * A biblioteca de arquivos do painel.
 *
 * `backend-old` tinha `GET /storage/paginate`, e a tela que a consome
 * (`files/page.tsx`) sobreviveu à migração - sem esta ação ela ficaria sem
 * backend.
 */
@inject()
export default class StoragesFilePaginateUseCase {
  constructor(
    private readonly storages: StorageRepository,
    private readonly bucket: StorageContract,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // `recentFirst` e não `sortOrder`: numa biblioteca de arquivos o que
      // interessa é o que acabou de subir. É a ordem que `backend-old` dava.
      const [sort, direction] = recentFirst(payload)

      const page = await this.storages.paginate({
        page: payload.page ?? PAGINATION.PAGE,
        perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        search: payload.search,
        status: payload.status,
        mimetype: payload.mimetype,
        sort,
        direction,
      })

      return right({
        meta: page.meta,
        data: await Promise.all(page.data.map((file) => this.bucket.withUrl(file))),
      })
    } catch (error) {
      logger.error({ err: error }, '[storages/files > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STORAGES_FILE_PAGINATE_ERROR',
        ),
      )
    }
  }
}
