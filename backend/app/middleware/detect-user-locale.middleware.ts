import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'
import type { NextFn } from '@adonisjs/core/types/http'
import type { HttpContext } from '@adonisjs/core/http'
import { BASE_LOCALE } from '@interclasse/shared'

/**
 * O idioma da requisição, lido do `Accept-Language` e restrito a pt-BR, es e en,
 * com fallback no pt-BR (`_standards/i18n.md` §3,
 * _doc-lib/adonisjs.md#guides/digging-deeper/i18n).
 *
 * Põe em `ctx.i18n` o tradutor daquele idioma: é ele que o `t()` de `#core/i18n`
 * lê, e é por ele que `start/validator.ts` escolhe as mensagens do VineJS. A
 * 422 e o erro de negócio saem na língua de quem pediu; o `code` do envelope
 * nunca se traduz.
 */
export default class DetectUserLocaleMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const language = i18nManager.getSupportedLocaleFor(ctx.request.languages())

    ctx.i18n = i18nManager.locale(language ?? BASE_LOCALE)
    // Quem injeta `I18n` pelo container recebe o da requisição.
    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    return next()
  }
}
