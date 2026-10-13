import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import Announcement from '#models/announcement'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, Announcement>

@inject()
export default class AdministratorAnnouncementShowUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const announcement = await Announcement.find(id)

      if (!announcement)
        return left(HTTPException.NotFound('Aviso não encontrado', 'ANNOUNCEMENT_NOT_FOUND'))

      return right(announcement)
    } catch (error) {
      logger.error({ err: error }, '[announcements > show][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_ANNOUNCEMENT_SHOW_ERROR',
        ),
      )
    }
  }
}
