import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import SiteSetting from '#models/site-setting'
import SiteService from '#services/site/site.service'
import HTTPException from '#exceptions/http.exception'

type Response = Either<HTTPException, SiteSetting>

@inject()
export default class AdministratorSiteShowUseCase {
  constructor(private readonly site: SiteService) {}

  async execute(): Promise<Response> {
    try {
      return right(await this.site.current())
    } catch (error) {
      logger.error({ err: error }, '[site > show][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_SITE_SHOW_ERROR',
        ),
      )
    }
  }
}
