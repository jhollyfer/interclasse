import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type AdministratorSiteShowResponse, type Either } from '@interclasse/shared'

import { SiteSettingRepository } from '#repositories/site-setting/site-setting.repository'
import HTTPException from '#exceptions/http.exception'
import type { RegulationFile } from '#domain/site-setting/site-setting.entity'
import type { SiteSettingError } from '#domain/site-setting/site-setting.errors'
import type { AdministratorSiteUpdatePayload } from '#validators/administrator/site.validator'

type Payload = AdministratorSiteUpdatePayload
type Response = Either<HTTPException, AdministratorSiteShowResponse>

/**
 * Grava o que veio no payload. O regulamento é conferido pela entidade (arquivo
 * já enviado e em PDF); o use-case só busca o arquivo e traduz a recusa.
 */
@inject()
export default class AdministratorSiteUpdateUseCase {
  constructor(
    private readonly settings: SiteSettingRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const setting = await this.settings.current()
      let regulation: RegulationFile | null = null
      if (setting.replacesRegulation(payload.regulationId))
        regulation = await this.settings.findRegulationFile(payload.regulationId)

      const updated = setting.update(payload, { regulation, now: new Date() })
      if (updated.isLeft()) return left(this.refusal(updated.value))

      await this.settings.save(setting)

      return right(await this.settings.show())
    } catch (error) {
      logger.error({ err: error }, '[administrator/site > update][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_SITE_UPDATE_ERROR',
        ),
      )
    }
  }

  /**
   * Cada recusa da configuração como resposta HTTP (`_standards/domain.md`
   * §2). O `never` do fim faz o compilador apontar fato novo sem tradução.
   */
  private refusal(error: SiteSettingError): HTTPException {
    switch (error.code) {
      case 'STORAGE_NOT_FOUND':
        return HTTPException.UnprocessableEntity(
          this.i18n.t('site.regulation_not_found'),
          'STORAGE_NOT_FOUND',
          { regulationId: this.i18n.t('site.regulation_not_found') },
        )
      case 'REGULATION_NOT_PDF':
        return HTTPException.UnprocessableEntity(
          this.i18n.t('site.regulation_not_pdf'),
          'REGULATION_NOT_PDF',
          { regulationId: this.i18n.t('site.regulation_not_pdf_field') },
        )
      default:
        return this.unreachable(error)
    }
  }

  private unreachable(error: never): never {
    throw new Error(`Recusa da configuração do site sem tradução: ${JSON.stringify(error)}`)
  }
}
