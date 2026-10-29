import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'
import { PAGINATION, left, right, type Either, type Paginated } from '@interclasse/shared'

import Photo from '#models/photo'
import HTTPException from '#exceptions/http.exception'
import type { PhotoPaginatePayload } from '#validators/administrator/photos.validator'

type Payload = PhotoPaginatePayload
type Response = Either<HTTPException, Paginated<ModelObject>>

/** Todas as fotos, com quem enviou. `?status=PENDING` é a fila de revisão. */
@inject()
export default class AdministratorPhotoPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const query = Photo.query().preload('storage').preload('author')
      if (payload.status) query.where('status', payload.status)

      const photos = await query
        .orderBy('createdAt', 'desc')
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: photos.getMeta(), data: photos.all() })
    } catch (error) {
      logger.error({ err: error }, '[photos > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_PHOTO_PAGINATE_ERROR',
        ),
      )
    }
  }
}
