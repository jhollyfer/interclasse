import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'

import Photo from '#models/photo'
import type User from '#models/user'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { PAGINATION, type Merge } from '#core/entity'
import { type Paginated } from '#core/response'
import type { PhotoPaginatePayload } from '#features/advisor/photos/photos.validator'

type Payload = Merge<PhotoPaginatePayload, { actor: User }>
type Response = Either<HTTPException, Paginated<ModelObject>>

/** As fotos que o conselheiro enviou, com a decisão da organização em cada uma. */
@inject()
export default class AdvisorPhotoPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const photos = await Photo.query()
        .where('authorId', payload.actor.id)
        .preload('storage')
        .orderBy('createdAt', 'desc')
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: photos.getMeta(), data: photos.all() })
    } catch (error) {
      logger.error({ err: error }, '[photos > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADVISOR_PHOTO_PAGINATE_ERROR',
        ),
      )
    }
  }
}
