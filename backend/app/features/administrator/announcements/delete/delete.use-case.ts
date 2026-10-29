import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import Announcement from '#models/announcement'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, Announcement>

/** Apaga de vez. Aviso vencido não tem o que restaurar. */
@inject()
export default class AdministratorAnnouncementDeleteUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const announcement = await Announcement.find(id)

      if (!announcement)
        return left(HTTPException.NotFound('Aviso não encontrado', 'ANNOUNCEMENT_NOT_FOUND'))

      await announcement.delete()

      return right(announcement)
    } catch (error) {
      logger.error({ err: error }, '[announcements > delete][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_ANNOUNCEMENT_DELETE_ERROR',
        ),
      )
    }
  }
}
