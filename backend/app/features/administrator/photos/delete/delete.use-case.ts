import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import Photo from '#models/photo'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, Photo>

/** Apaga de vez. O arquivo fica para o `storages:prune`. */
@inject()
export default class AdministratorPhotoDeleteUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const photo = await Photo.find(id)

      if (!photo) return left(HTTPException.NotFound('Foto não encontrada', 'PHOTO_NOT_FOUND'))

      await photo.delete()

      return right(photo)
    } catch (error) {
      logger.error({ err: error }, '[photos > delete][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_PHOTO_DELETE_ERROR',
        ),
      )
    }
  }
}
