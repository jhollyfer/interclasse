import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import Announcement from '#models/announcement'
import HTTPException from '#exceptions/http.exception'
import type { AnnouncementCreatePayload } from '#validators/administrator/announcements.validator'

type Payload = AnnouncementCreatePayload
type Response = Either<HTTPException, Announcement>

@inject()
export default class AdministratorAnnouncementCreateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const announcement = await Announcement.create(payload)

      // `pinned` vem de `DEFAULT` no banco quando ausente.
      await announcement.refresh()

      return right(announcement)
    } catch (error) {
      logger.error({ err: error }, '[announcements > create][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_ANNOUNCEMENT_CREATE_ERROR',
        ),
      )
    }
  }
}
