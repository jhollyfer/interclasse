import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import { PhotoRepository } from '#repositories/photo/photo.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/** Deletes for good. The file is left for `storages:prune`. */
@inject()
export default class AdministratorPhotoDeleteUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const photo = await this.photos.findById(id)
      if (!photo)
        return left(HTTPException.NotFound(this.i18n.t('photos.not_found'), 'PHOTO_NOT_FOUND'))

      await this.photos.delete(photo)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[administrator/photos > delete][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_PHOTO_DELETE_ERROR',
        ),
      )
    }
  }
}
