import Announcement from '#models/announcement'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { Merge } from '#core/entity'
import type { AdministratorAnnouncementUpdatePayload, IdentifierPayload } from '#core/validator'

type Payload = Merge<AdministratorAnnouncementUpdatePayload, IdentifierPayload>
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
        HTTPException.InternalServerError('Erro interno do servidor', 'ANNOUNCEMENT_UPDATE_ERROR')
      )
    }
  }
}
