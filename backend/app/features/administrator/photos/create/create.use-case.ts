import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { PHOTO_STATUS, left, type Either, type Merge } from '@interclasse/shared'

import Photo from '#models/photo'
import type User from '#models/user'
import PhotoService from '#services/photo/photo.service'
import HTTPException from '#exceptions/http.exception'
import type { PhotoCreatePayload } from '#validators/administrator/photos.validator'

type Payload = Merge<PhotoCreatePayload, { actor: User }>
type Response = Either<HTTPException, Photo>

/** A foto da organização vai direto ao site: quem aprova é ela mesma. */
@inject()
export default class AdministratorPhotoCreateUseCase {
  constructor(private readonly photos: PhotoService) {}

  async execute({ actor, ...upload }: Payload): Promise<Response> {
    try {
      const created = await this.photos.create(upload, actor, PHOTO_STATUS.APPROVED)
      if (created.isLeft()) return created

      const photo = created.value
      photo.merge({ reviewedById: actor.id, reviewedAt: photo.createdAt })
      await photo.save()

      return created
    } catch (error) {
      logger.error({ err: error }, '[photos > create][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_PHOTO_CREATE_ERROR',
        ),
      )
    }
  }
}
