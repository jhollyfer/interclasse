import Announcement from '#models/announcement'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { PAGINATION, recentFirst, type Paginated } from '#core/entity'
import type { AdministratorAnnouncementPaginationPayload } from '#core/validator'
import type { ModelObject } from '@adonisjs/lucid/types/model'

type Payload = AdministratorAnnouncementPaginationPayload
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
      logger.error({ err: error }, '[announcements > list][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'ANNOUNCEMENT_LIST_ERROR')
      )
    }
  }
}
