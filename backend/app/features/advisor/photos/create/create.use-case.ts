import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, type AdvisorPhotoShowResponse, type Either, type Merge } from '@interclasse/shared'

import { PhotoSubmissionBase } from '#features/_shared.photo-submission.base'
import { PhotoRepository } from '#repositories/photo/photo.repository'
import { PHOTO_SENDER } from '#domain/photo/photo.entity'
import HTTPException from '#exceptions/http.exception'
import type { AdvisorPhotoCreatePayload } from '#validators/advisor/photos.validator'

type Payload = Merge<AdvisorPhotoCreatePayload, { actor: { readonly id: string } }>
type Response = Either<HTTPException, AdvisorPhotoShowResponse>

/**
 * A foto do conselheiro nasce pendente: é foto de aluno num site aberto, e quem
 * decide se vai ao ar é a organização.
 */
@inject()
export default class AdvisorPhotoCreateUseCase extends PhotoSubmissionBase {
  constructor(photos: PhotoRepository, i18n: I18n) {
    super(photos, i18n)
  }

  async execute({ actor, ...upload }: Payload): Promise<Response> {
    try {
      return await this.submit({
        ...upload,
        author: actor,
        sender: PHOTO_SENDER.ADVISOR,
      })
    } catch (error) {
      logger.error({ err: error }, '[advisor/photos > create][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADVISOR_PHOTO_CREATE_ERROR',
        ),
      )
    }
  }
}
