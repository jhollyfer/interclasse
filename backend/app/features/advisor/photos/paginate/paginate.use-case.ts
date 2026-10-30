import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type AdvisorPhotoShowResponse,
  type Either,
  type Merge,
  type Paginated,
} from '@interclasse/shared'

import { PhotoRepository } from '#repositories/photo/photo.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdvisorPhotoPaginatePayload } from '#validators/advisor/photos.validator'

type Payload = Merge<AdvisorPhotoPaginatePayload, { actor: { readonly id: string } }>
type Response = Either<HTTPException, Paginated<AdvisorPhotoShowResponse>>

/** As fotos que o conselheiro enviou, com a decisão da organização em cada uma. */
@inject()
export default class AdvisorPhotoPaginateUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      return right(
        await this.photos.paginate({
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
          authorId: payload.actor.id,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[advisor/photos > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADVISOR_PHOTO_PAGINATE_ERROR',
        ),
      )
    }
  }
}
