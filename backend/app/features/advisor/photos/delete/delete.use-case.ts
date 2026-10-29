import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import type Photo from '#models/photo'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'

type Response = Either<HTTPException, Photo>

/** Tira a foto do carrossel e da lista de quem enviou. O arquivo fica para o `storages:prune`. */
@inject()
export default class AdvisorPhotoDeleteUseCase {
  async execute(photo: Photo): Promise<Response> {
    try {
      await photo.delete()

      return right(photo)
    } catch (error) {
      logger.error({ err: error }, '[photos > delete][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'ADVISOR_PHOTO_DELETE_ERROR'),
      )
    }
  }
}
