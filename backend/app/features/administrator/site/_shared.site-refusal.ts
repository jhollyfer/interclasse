import type { I18n } from '@adonisjs/i18n'

import { RefusalBase, type RefusalTable } from '#features/_shared.refusal.base'
import HTTPException from '#exceptions/http.exception'
import type { SiteSettingError } from '#domain/site-setting/site-setting.errors'

/** Cada recusa da configuração do site como resposta HTTP (`_standards/domain.md` §2). */
export class SiteRefusal extends RefusalBase {
  private static readonly TABLE = {
    STORAGE_NOT_FOUND: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(i18n.t('site.regulation_not_found'), 'STORAGE_NOT_FOUND', {
        regulationId: i18n.t('site.regulation_not_found'),
      }),
    REGULATION_NOT_PDF: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(i18n.t('site.regulation_not_pdf'), 'REGULATION_NOT_PDF', {
        regulationId: i18n.t('site.regulation_not_pdf_field'),
      }),
  } satisfies RefusalTable<SiteSettingError>

  static http(error: SiteSettingError, i18n: I18n): HTTPException {
    return SiteRefusal.translate(SiteRefusal.TABLE, error.code, error, i18n)
  }
}
