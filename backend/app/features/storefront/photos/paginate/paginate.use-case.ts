import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type Either,
  type Paginated,
  type StorefrontPhotoShowResponse,
} from '@interclasse/shared'

import { PhotoRepository } from '#repositories/photo/photo.repository'
import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage.contract'
import type { PagePayload } from '#core/validator'

type Payload = PagePayload
type Response = Either<HTTPException, Paginated<StorefrontPhotoShowResponse>>

/**
 * The site carousel: only the approved ones, newest to oldest. The signed URL
 * and the caption go out; who submitted and the path in the bucket stay out.
 */
@inject()
export default class StorefrontPhotoPaginateUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly bucket: StorageContract,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const page = await this.photos.paginateApproved({
        page: payload.page ?? PAGINATION.PAGE,
        perPage: payload.perPage ?? PAGINATION.PER_PAGE,
      })

      return right({
        meta: page.meta,
        data: await Promise.all(
          page.data.map(async ({ path, ...photo }) => ({
            ...photo,
            url: await this.bucket.signedUrl(path),
          })),
        ),
      })
    } catch (error) {
      logger.error({ err: error }, '[storefront/photos > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STOREFRONT_PHOTO_PAGINATE_ERROR',
        ),
      )
    }
  }
}
