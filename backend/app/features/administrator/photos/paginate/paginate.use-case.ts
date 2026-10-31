import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type AdministratorPhotoShowResponse,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import { PhotoRepository } from '#repositories/photo/photo.repository'
import HTTPException from '#exceptions/http.exception'
import { PhotoReadBase } from '#features/_shared.photo-read.base'
import { StorageContract } from '#services/storage/storage.contract'
import type { AdministratorPhotoPaginatePayload } from '#validators/administrator/photos.validator'

type Payload = AdministratorPhotoPaginatePayload
type Response = Either<HTTPException, Paginated<AdministratorPhotoShowResponse>>

/** All photos, with who submitted them. `?status=PENDING` is the review queue. */
@inject()
export default class AdministratorPhotoPaginateUseCase extends PhotoReadBase {
  constructor(photos: PhotoRepository, bucket: StorageContract, i18n: I18n) {
    super(photos, bucket, i18n)
  }

  async execute(payload: Payload): Promise<Response> {
    try {
      return right(
        await this.signedPage(
          await this.photos.paginate({
            page: payload.page ?? PAGINATION.PAGE,
            perPage: payload.perPage ?? PAGINATION.PER_PAGE,
            status: payload.status,
          }),
        ),
      )
    } catch (error) {
      logger.error({ err: error }, '[administrator/photos > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_PHOTO_PAGINATE_ERROR',
        ),
      )
    }
  }
}
