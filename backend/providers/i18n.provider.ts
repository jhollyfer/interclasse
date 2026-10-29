import { I18n } from '@adonisjs/i18n'
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * O `I18n` que todo use-case recebe no construtor para escrever a mensagem do
 * `HTTPException` (`_standards/i18n.md` §3).
 *
 * Na requisição, o middleware de idioma liga no resolver da requisição o
 * tradutor do `Accept-Language`, e é esse que chega. Fora dela - seed, comando
 * do ace, teste unitário - vale este, no idioma base: o use-case roda nos dois
 * lugares, e por isso o idioma entra por injeção, a forma que a doc prefere ao
 * async local storage (_doc-lib/adonisjs.md#guides/basics/http-context).
 */
export default class I18nProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(I18n, async (resolver) => {
      const i18nManager = await resolver.make('i18n')

      return i18nManager.locale(i18nManager.defaultLocale)
    })
  }
}
