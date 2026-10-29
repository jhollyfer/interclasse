import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import Photo from '#models/photo'
import type User from '#models/user'
import PhotoService from '#services/photo/photo.service'
import { left, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { PHOTO_STATUS, type Merge } from '#core/entity'
import type { PhotoCreatePayload } from '#features/advisor/photos/photos.validator'

type Payload = Merge<PhotoCreatePayload, { actor: User }>
type Response = Either<HTTPException, Photo>

/**
 * A foto do conselheiro nasce pendente: é foto de aluno num site aberto, e quem
 * decide se vai ao ar é a organização.
 */
@inject()
export default class AdvisorPhotoCreateUseCase {
  constructor(private readonly photos: PhotoService) {}

  async execute({ actor, ...upload }: Payload): Promise<Response> {
    try {
      return await this.photos.create(upload, actor, PHOTO_STATUS.PENDING)
    } catch (error) {
      logger.error({ err: error }, '[photos > create][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'ADVISOR_PHOTO_CREATE_ERROR'),
      )
    }
  }
}
