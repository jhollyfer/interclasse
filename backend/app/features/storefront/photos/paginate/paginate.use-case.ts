import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'
import {
  PAGINATION,
  PHOTO_STATUS,
  left,
  right,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import Photo from '#models/photo'
import HTTPException from '#exceptions/http.exception'
import type { PagePayload } from '#core/validator'

type Payload = PagePayload
type Response = Either<HTTPException, Paginated<ModelObject>>

/**
 * O carrossel do site: só as aprovadas, da mais nova à mais antiga. Sai a URL
 * assinada e a legenda; quem enviou e o caminho no bucket ficam de fora.
 */
@inject()
export default class StorefrontPhotoPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const photos = await Photo.query()
        .where('status', PHOTO_STATUS.APPROVED)
        .preload('storage')
        .orderBy('createdAt', 'desc')
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({
        meta: photos.getMeta(),
        data: photos.all().map((photo) => ({
          id: photo.id,
          caption: photo.caption,
          url: photo.storage.url,
          createdAt: photo.createdAt,
        })),
      })
    } catch (error) {
      logger.error({ err: error }, '[storefront > photos][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'STOREFRONT_PHOTO_PAGINATE_ERROR',
        ),
      )
    }
  }
}
