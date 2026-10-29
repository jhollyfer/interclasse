import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { USER_ROLE, left, right, type Either, type Merge } from '@interclasse/shared'

import Photo from '#models/photo'
import type User from '#models/user'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<IdentifierPayload, { actor: User }>
type Response = Either<HTTPException, Photo>

/**
 * Tira do carrossel uma foto que o próprio conselheiro enviou. A de outro é
 * `404`, como a turma alheia: dizer "proibido" confirmaria que ela existe. O
 * administrador apaga qualquer uma. O arquivo fica para o `storages:prune`.
 */
@inject()
export default class AdvisorPhotoDeleteUseCase {
  async execute({ id, actor }: Payload): Promise<Response> {
    try {
      const query = Photo.query().where('id', id)
      if (actor.role !== USER_ROLE.ADMINISTRATOR) query.where('authorId', actor.id)
      const photo = await query.first()

      if (!photo) return left(HTTPException.NotFound('Foto não encontrada', 'PHOTO_NOT_FOUND'))

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
