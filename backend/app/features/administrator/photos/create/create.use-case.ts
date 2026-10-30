import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  type AdministratorPhotoShowResponse,
  type Either,
  type Merge,
} from '@interclasse/shared'

import { PhotoSubmission } from '#features/_shared.photo-submission'
import { PHOTO_SENDER } from '#domain/photo/photo.entity'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorPhotoCreatePayload } from '#validators/administrator/photos.validator'

type Payload = Merge<AdministratorPhotoCreatePayload, { actor: { readonly id: string } }>
type Response = Either<HTTPException, AdministratorPhotoShowResponse>

/** A foto da organização vai direto ao site: quem aprova é ela mesma. */
@inject()
export default class AdministratorPhotoCreateUseCase {
  constructor(
    private readonly submission: PhotoSubmission,
    private readonly i18n: I18n,
  ) {}

  async execute({ actor, ...upload }: Payload): Promise<Response> {
    try {
      return await this.submission.submit({
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
