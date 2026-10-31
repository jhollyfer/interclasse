import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  type AdministratorPhotoShowResponse,
  type Either,
  type Merge,
} from '@interclasse/shared'

import { PhotoSubmissionBase } from '#features/_shared.photo-submission.base'
import { PhotoRepository } from '#repositories/photo/photo.repository'
import { PHOTO_SENDER } from '#domain/photo/photo.entity'
import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage.contract'
import type { AdministratorPhotoCreatePayload } from '#validators/administrator/photos.validator'

type Payload = Merge<AdministratorPhotoCreatePayload, { actor: { readonly id: string } }>
type Response = Either<HTTPException, AdministratorPhotoShowResponse>

/** The organization photo goes straight to the site: it approves itself. */
@inject()
export default class AdministratorPhotoCreateUseCase extends PhotoSubmissionBase {
  constructor(photos: PhotoRepository, bucket: StorageContract, i18n: I18n) {
    super(photos, bucket, i18n)
  }

  async execute({ actor, ...upload }: Payload): Promise<Response> {
    try {
      return await this.submit({
        ...upload,
        author: actor,
        sender: PHOTO_SENDER.ADMINISTRATOR,
      })
    } catch (error) {
      logger.error({ err: error }, '[administrator/photos > create][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_PHOTO_CREATE_ERROR',
        ),
      )
    }
  }
}
