import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'
import { PAGINATION, left, right, type Either, type Paginated } from '@interclasse/shared'

import Announcement from '#models/announcement'
import HTTPException from '#exceptions/http.exception'
import type { PaginationPayload } from '#core/validator'

type Payload = PaginationPayload
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class StorefrontAnnouncementPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const query = Announcement.query()

      if (payload.search) query.whereILike('title', `%${payload.search}%`)

      const announcements = await query
        .orderBy('pinned', 'desc')
        .orderBy('createdAt', 'desc')
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: announcements.getMeta(), data: announcements.all() })
    } catch (error) {
      logger.error({ err: error }, '[announcements > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'STOREFRONT_ANNOUNCEMENT_PAGINATE_ERROR',
        ),
      )
    }
  }
}
