import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { left, right, type Either, type Merge } from '@interclasse/shared'

import Photo from '#models/photo'
import type User from '#models/user'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'
import type { PhotoReviewPayload } from '#validators/administrator/photos.validator'

type Payload = Merge<Merge<PhotoReviewPayload, IdentifierPayload>, { actor: User }>
type Response = Either<HTTPException, Photo>

/**
 * Aprovar põe a foto no site; recusar tira. A decisão se refaz: foto recusada
 * por engano é aprovada de novo, e a aprovada pode sair do ar sem ser apagada.
 */
@inject()
export default class AdministratorPhotoReviewUseCase {
  async execute({ id, status, actor }: Payload): Promise<Response> {
    try {
      const photo = await Photo.find(id)

      if (!photo) return left(HTTPException.NotFound('Foto não encontrada', 'PHOTO_NOT_FOUND'))

      photo.merge({ status, reviewedById: actor.id, reviewedAt: DateTime.now() })
      await photo.save()
      await photo.load('storage')
      await photo.load('author')

      return right(photo)
    } catch (error) {
      logger.error({ err: error }, '[photos > review][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_PHOTO_REVIEW_ERROR',
        ),
      )
    }
  }
}
