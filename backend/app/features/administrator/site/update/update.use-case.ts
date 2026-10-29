import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { UPLOAD_STATUS, left, right, type Either } from '@interclasse/shared'

import SiteSetting from '#models/site-setting'
import Storage from '#models/storage'
import SiteService from '#services/site/site.service'
import HTTPException from '#exceptions/http.exception'
import type { SiteUpdatePayload } from '#features/administrator/site/site.validator'

type Payload = SiteUpdatePayload
type Response = Either<HTTPException, SiteSetting>

/** O regulamento é para baixar e imprimir: só PDF. */
const REGULATION_MIMETYPE = 'application/pdf'

@inject()
export default class AdministratorSiteUpdateUseCase {
  constructor(private readonly site: SiteService) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      if (payload.regulationId) {
        const regulation = await Storage.query()
          .where('id', payload.regulationId)
          .where('status', UPLOAD_STATUS.UPLOADED)
          .withScopes((scopes) => scopes.notDeleted())
          .first()

        if (!regulation)
          return left(
            HTTPException.UnprocessableEntity('Arquivo não encontrado', 'STORAGE_NOT_FOUND', {
              regulationId: 'Arquivo não encontrado',
            }),
          )

        if (regulation.mimetype !== REGULATION_MIMETYPE)
          return left(
            HTTPException.UnprocessableEntity(
              'O regulamento precisa ser PDF',
              'REGULATION_NOT_PDF',
              {
                regulationId: 'Envie o regulamento em PDF',
              },
            ),
          )
      }

      const setting = await this.site.current()
      setting.merge(payload)
      await setting.save()
      await setting.load('regulation')

      return right(setting)
    } catch (error) {
      logger.error({ err: error }, '[site > update][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_SITE_UPDATE_ERROR',
        ),
      )
    }
  }
}
