import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type AdministratorSiteShowResponse, type Either } from '@interclasse/shared'

import { SiteRefusal } from '../_shared.site-refusal.ts'

import { SiteSettingRepository } from '#repositories/site-setting/site-setting.repository'
import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage.contract'
import type { RegulationFile } from '#domain/site-setting/site-setting.entity'
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
    private readonly bucket: StorageContract,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const setting = await this.settings.current()
      let regulation: RegulationFile | null = null
      if (setting.replacesRegulation(payload.regulationId))
        regulation = await this.settings.findRegulationFile(payload.regulationId)

      const updated = setting.update(payload, { regulation, now: new Date() })
      if (updated.isLeft()) return left(SiteRefusal.http(updated.value, this.i18n))

      await this.settings.save(setting)

      const shown = await this.settings.show()

      return right({
        ...shown,
        regulation: shown.regulation && (await this.bucket.withUrl(shown.regulation)),
      })
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
}
