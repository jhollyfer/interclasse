import app from '@adonisjs/core/services/app'
import { defineConfig, formatters, loaders } from '@adonisjs/i18n'
import type { I18n } from '@adonisjs/i18n'
import { BASE_LOCALE, LOCALES } from '@interclasse/shared'

/**
 * The product languages come from `shared/` (`_standards/i18n.md` §1): a new language
 * goes in there, not here. The business messages live in
 * `resources/lang/{pt-BR,es,en}/` in ICU format
 * (_doc-lib/adonisjs.md#guides/digging-deeper/i18n).
 */
const i18nConfig = defineConfig({
  defaultLocale: BASE_LOCALE,
  supportedLocales: [...LOCALES],
  formatter: formatters.icu(),
  loaders: [loaders.fs({ location: app.languageFilesPath() })],
})

export default i18nConfig

/**
 * The request translator in `ctx.i18n`, set by
 * `detect-user-locale.middleware.ts`. Here, in a type-and-config-only file, and
 * not in the middleware: augmenting `HttpContext` in the same module that imports
 * `I18n` as a value breaks the whole context type in TypeScript 7.
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    i18n: I18n
  }
}
