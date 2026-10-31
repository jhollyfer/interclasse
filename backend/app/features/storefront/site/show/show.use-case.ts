import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either, type StorefrontSiteShowResponse } from '@interclasse/shared'

import { SiteSettingRepository } from '#repositories/site-setting/site-setting.repository'
import HTTPException from '#exceptions/http.exception'
import { StorageContract } from '#services/storage/storage.contract'

type Response = Either<HTTPException, StorefrontSiteShowResponse>

/**
 * The "About" and the regulation for the anonymous site. Only what the download
 * button needs leaves the file - the signed URL, the name and the size -, without the
 * path in the bucket or the upload id.
 */
@inject()
export default class StorefrontSiteShowUseCase {
  constructor(
    private readonly settings: SiteSettingRepository,
    private readonly bucket: StorageContract,
    private readonly i18n: I18n,
  ) {}

  async execute(): Promise<Response> {
    try {
      const { regulation, ...setting } = await this.settings.showPublic()

      return right({
        ...setting,
        regulation: regulation && {
          url: await this.bucket.signedUrl(regulation.path),
          originalName: regulation.originalName,
          size: regulation.size,
        },
      })
    } catch (error) {
      logger.error({ err: error }, '[storefront/site > show][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STOREFRONT_SITE_SHOW_ERROR',
        ),
      )
    }
  }
}
