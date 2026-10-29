import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type AdministratorPhotoShowResponse,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import { PhotoRepository } from '#repositories/photo/photo.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorPhotoPaginatePayload } from '#validators/administrator/photos.validator'

type Payload = AdministratorPhotoPaginatePayload
type Response = Either<HTTPException, Paginated<AdministratorPhotoShowResponse>>

/** Todas as fotos, com quem enviou. `?status=PENDING` é a fila de revisão. */
@inject()
export default class AdministratorPhotoPaginateUseCase {
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
          status: payload.status,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[administrator/photos > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_PHOTO_PAGINATE_ERROR',
        ),
      )
    }
  }
}
