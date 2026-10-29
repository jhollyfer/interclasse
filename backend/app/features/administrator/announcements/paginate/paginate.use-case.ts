import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'
import { PAGINATION, left, right, type Either, type Paginated } from '@interclasse/shared'

import Announcement from '#models/announcement'
import HTTPException from '#exceptions/http.exception'
import { recentFirst } from '#features/_shared.sort'
import type { AnnouncementPaginatePayload } from '#features/administrator/announcements/announcements.validator'

type Payload = AnnouncementPaginatePayload
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class AdministratorAnnouncementPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const query = Announcement.query()

      if (payload.search) query.whereILike('title', `%${payload.search}%`)

      // Fixado sempre antes: é o que o site mostra no topo, e a lista do painel
      // espelha a ordem do site.
      if (!payload.sort) query.orderBy('pinned', 'desc')

      const announcements = await query
        .orderBy(...recentFirst(payload))
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: announcements.getMeta(), data: announcements.all() })
    } catch (error) {
      logger.error({ err: error }, '[announcements > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_ANNOUNCEMENT_PAGINATE_ERROR',
        ),
      )
    }
  }
}
