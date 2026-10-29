import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorAnnouncementShowResponse,
  type Either,
} from '@interclasse/shared'

import { AnnouncementPresenter } from '../announcements.presenter.ts'

import { AnnouncementRepository } from '#repositories/announcement/announcement.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, AdministratorAnnouncementShowResponse>

@inject()
export default class AdministratorAnnouncementShowUseCase {
  constructor(
    private readonly announcements: AnnouncementRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const announcement = await this.announcements.findById(id)
      if (!announcement)
        return left(
          HTTPException.NotFound(this.i18n.t('announcements.not_found'), 'ANNOUNCEMENT_NOT_FOUND'),
        )

      return right(AnnouncementPresenter.show(announcement))
    } catch (error) {
      logger.error({ err: error }, '[administrator/announcements > show][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_ANNOUNCEMENT_SHOW_ERROR',
        ),
      )
    }
  }
}
