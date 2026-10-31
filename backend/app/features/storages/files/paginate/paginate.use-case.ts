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
 * The panel file library.
 *
 * `backend-old` had `GET /storage/paginate`, and the screen that consumes it
 * (`files/page.tsx`) survived the migration - without this action it would be left without
 * a backend.
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
      // `recentFirst` and not `sortOrder`: in a file library what
      // matters is what has just been uploaded. It is the order `backend-old` gave.
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
