import { I18n } from '@adonisjs/i18n'
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * The `I18n` every use case receives in the constructor to write the
 * `HTTPException` message (`_standards/i18n.md` §3).
 *
 * In a request, the language middleware binds the `Accept-Language` translator to the
 * request resolver, and that is the one that arrives. Outside it - seed, ace command,
 * unit test - this one applies, in the base language: the use case runs in both
 * places, which is why the language comes in by injection, the form the doc prefers
 * over async local storage (_doc-lib/adonisjs.md#guides/basics/http-context).
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
