import { randomUUID } from 'node:crypto'

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

import { Announcement } from '#domain/announcement/announcement.entity'
import { AnnouncementRepository } from '#repositories/announcement/announcement.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorAnnouncementCreatePayload } from '#validators/administrator/announcements.validator'

type Payload = AdministratorAnnouncementCreatePayload
type Response = Either<HTTPException, AdministratorAnnouncementShowResponse>

/** Publica na hora: o aviso aparece no site assim que é criado. */
@inject()
export default class AdministratorAnnouncementCreateUseCase {
  constructor(
    private readonly announcements: AnnouncementRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const announcement = Announcement.create({ id: randomUUID(), ...payload, now: new Date() })

      await this.announcements.save(announcement)

      return right(AnnouncementPresenter.show(announcement))
    } catch (error) {
      logger.error({ err: error }, '[administrator/announcements > create][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_ANNOUNCEMENT_CREATE_ERROR',
        ),
      )
    }
  }
}
