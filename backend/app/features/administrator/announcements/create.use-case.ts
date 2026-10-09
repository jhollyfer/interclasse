import Announcement from '#models/announcement'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { AdministratorAnnouncementCreatePayload } from '#core/validator'

type Payload = AdministratorAnnouncementCreatePayload
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
        HTTPException.InternalServerError('Erro interno do servidor', 'ANNOUNCEMENT_CREATE_ERROR')
      )
    }
  }
}
