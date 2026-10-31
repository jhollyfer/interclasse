import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'
import type { NextFn } from '@adonisjs/core/types/http'
import type { HttpContext } from '@adonisjs/core/http'
import { BASE_LOCALE } from '@interclasse/shared'

/**
 * The request language, read from `Accept-Language` and restricted to pt-BR, es and en,
 * with a pt-BR fallback (`_standards/i18n.md` §3,
 * _doc-lib/adonisjs.md#guides/digging-deeper/i18n).
 *
 * It puts in `ctx.i18n` the translator for that language: it is what `t()` from `#core/i18n`
 * reads, and it is what `start/validator.ts` uses to choose the VineJS messages. The
 * 422 and the business error come out in the language of whoever asked; the envelope `code`
 * is never translated.
 */
export default class DetectUserLocaleMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const language = i18nManager.getSupportedLocaleFor(ctx.request.languages())

    ctx.i18n = i18nManager.locale(language ?? BASE_LOCALE)
    // Whoever injects `I18n` through the container receives the request's.
    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    return next()
  }
}
