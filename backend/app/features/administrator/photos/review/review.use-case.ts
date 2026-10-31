import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorPhotoShowResponse,
  type Either,
  type Merge,
} from '@interclasse/shared'

import { PhotoRepository } from '#repositories/photo/photo.repository'
import HTTPException from '#exceptions/http.exception'
import { PhotoReadBase } from '#features/_shared.photo-read.base'
import { StorageContract } from '#services/storage/storage.contract'
import type { IdentifierPayload } from '#core/validator'
import type { AdministratorPhotoReviewPayload } from '#validators/administrator/photos.validator'

type Payload = Merge<
  Merge<AdministratorPhotoReviewPayload, IdentifierPayload>,
  { actor: { readonly id: string } }
>
type Response = Either<HTTPException, AdministratorPhotoShowResponse>

/**
 * Approving puts the photo on the site; rejecting takes it off. The decision can be redone: a photo rejected
 * by mistake is approved again, and an approved one can go offline without being deleted.
 */
@inject()
export default class AdministratorPhotoReviewUseCase extends PhotoReadBase {
  constructor(photos: PhotoRepository, bucket: StorageContract, i18n: I18n) {
    super(photos, bucket, i18n)
  }

  async execute({ id, status, actor }: Payload): Promise<Response> {
    try {
      const photo = await this.photos.findById(id)
      if (!photo)
        return left(HTTPException.NotFound(this.i18n.t('photos.not_found'), 'PHOTO_NOT_FOUND'))

      photo.review({ status, reviewerId: actor.id, now: new Date() })
      await this.photos.save(photo)

      const shown = await this.photos.show(id)
      if (!shown)
        return left(HTTPException.NotFound(this.i18n.t('photos.not_found'), 'PHOTO_NOT_FOUND'))

      return right(await this.signed(shown))
    } catch (error) {
      logger.error({ err: error }, '[administrator/photos > review][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_PHOTO_REVIEW_ERROR',
        ),
      )
    }
  }
}
