import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'

import Announcement from '#models/announcement'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { PAGINATION, type Paginated } from '#core/entity'
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
      logger.error({ err: error }, '[storefront announcements > list][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'ANNOUNCEMENT_LIST_ERROR'),
      )
    }
  }
}
