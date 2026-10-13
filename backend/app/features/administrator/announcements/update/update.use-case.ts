import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import Announcement from '#models/announcement'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import type { Merge } from '#core/entity'
import type { AnnouncementUpdatePayload } from '#features/administrator/announcements/announcements.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<AnnouncementUpdatePayload, IdentifierPayload>
type Response = Either<HTTPException, Announcement>

@inject()
export default class AdministratorAnnouncementUpdateUseCase {
  async execute({ id, ...payload }: Payload): Promise<Response> {
    try {
      const announcement = await Announcement.find(id)

      if (!announcement)
        return left(HTTPException.NotFound('Aviso não encontrado', 'ANNOUNCEMENT_NOT_FOUND'))

      announcement.merge(payload)
      await announcement.save()

      return right(announcement)
    } catch (error) {
      logger.error({ err: error }, '[announcements > update][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'ANNOUNCEMENT_UPDATE_ERROR'),
      )
    }
  }
}
