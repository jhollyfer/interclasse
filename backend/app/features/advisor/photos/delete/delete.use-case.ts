import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { USER_ROLE, left, right, type Either, type Merge, type UserRole } from '@interclasse/shared'

import { PhotoRepository } from '#repositories/photo/photo.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<IdentifierPayload, { actor: { readonly id: string; readonly role: UserRole } }>
type Response = Either<HTTPException, null>

/**
 * Removes from the carousel a photo the advisor themselves submitted. Another's is
 * `404`, like the foreign classroom: saying "forbidden" would confirm it exists. The
 * administrator deletes any one. The file is left for `storages:prune`.
 */
@inject()
export default class AdvisorPhotoDeleteUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id, actor }: Payload): Promise<Response> {
    try {
      // Ownership goes into the search criteria: a foreign photo returns `null`, just like
      // one that does not exist.
      let photo = await this.photos.findOwned(id, actor.id)
      if (!photo && actor.role === USER_ROLE.ADMINISTRATOR) photo = await this.photos.findById(id)
      if (!photo)
        return left(HTTPException.NotFound(this.i18n.t('photos.not_found'), 'PHOTO_NOT_FOUND'))

      await this.photos.delete(photo)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[advisor/photos > delete][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADVISOR_PHOTO_DELETE_ERROR',
        ),
      )
    }
  }
}
