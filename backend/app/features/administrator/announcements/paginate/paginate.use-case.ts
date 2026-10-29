import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type AdministratorAnnouncementShowResponse,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import { AnnouncementRepository } from '#repositories/announcement/announcement.repository'
import HTTPException from '#exceptions/http.exception'
import { recentFirst } from '#features/_shared.sort'
import type { AdministratorAnnouncementPaginatePayload } from '#validators/administrator/announcements.validator'

type Payload = AdministratorAnnouncementPaginatePayload
type Response = Either<HTTPException, Paginated<AdministratorAnnouncementShowResponse>>

@inject()
export default class AdministratorAnnouncementPaginateUseCase {
  constructor(
    private readonly announcements: AnnouncementRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const [sort, direction] = recentFirst(payload)

      return right(
        await this.announcements.paginate({
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
          search: payload.search,
          sort,
          direction,
          // Fixado sempre antes, a não ser que peçam outra ordem: é o que o site
          // mostra no topo, e a lista do painel espelha a ordem do site.
          pinnedFirst: !payload.sort,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[administrator/announcements > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_ANNOUNCEMENT_PAGINATE_ERROR',
        ),
      )
    }
  }
}
