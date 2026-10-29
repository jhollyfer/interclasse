import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  SORT_DIRECTION,
  left,
  right,
  type Either,
  type Paginated,
  type StorefrontAnnouncementShowResponse,
} from '@interclasse/shared'

import { AnnouncementRepository } from '#repositories/announcement/announcement.repository'
import HTTPException from '#exceptions/http.exception'
import type { PaginationPayload } from '#core/validator'

type Payload = PaginationPayload
type Response = Either<HTTPException, Paginated<StorefrontAnnouncementShowResponse>>

/** Os avisos do site: fixados primeiro, depois do mais novo ao mais antigo. */
@inject()
export default class StorefrontAnnouncementPaginateUseCase {
  constructor(
    private readonly announcements: AnnouncementRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      return right(
        await this.announcements.paginate({
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
          search: payload.search,
          sort: 'createdAt',
          direction: SORT_DIRECTION.DESC,
          pinnedFirst: true,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[storefront/announcements > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STOREFRONT_ANNOUNCEMENT_PAGINATE_ERROR',
        ),
      )
    }
  }
}
