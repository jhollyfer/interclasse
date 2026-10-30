import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type AdministratorSiteShowResponse, type Either } from '@interclasse/shared'

import { SiteSettingRepository } from '#repositories/site-setting/site-setting.repository'
import HTTPException from '#exceptions/http.exception'

type Response = Either<HTTPException, AdministratorSiteShowResponse>

@inject()
export default class AdministratorSiteShowUseCase {
  constructor(
    private readonly settings: SiteSettingRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(): Promise<Response> {
    try {
      return right(await this.settings.show())
    } catch (error) {
      logger.error({ err: error }, '[administrator/site > show][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_SITE_SHOW_ERROR',
        ),
      )
    }
  }
}
