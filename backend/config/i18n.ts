import app from '@adonisjs/core/services/app'
import { defineConfig, formatters, loaders } from '@adonisjs/i18n'
import type { I18n } from '@adonisjs/i18n'
import { BASE_LOCALE, LOCALES } from '@interclasse/shared'

/**
 * Os idiomas do produto vêm do `shared/` (`_standards/i18n.md` §1): idioma novo
 * entra lá, não aqui. As mensagens de negócio moram em
 * `resources/lang/{pt-BR,es,en}/` no formato ICU
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
 * O tradutor da requisição em `ctx.i18n`, posto pelo
 * `detect-user-locale.middleware.ts`. Aqui, num arquivo só de tipo e config, e
 * não no middleware: aumentar o `HttpContext` no mesmo módulo que importa o
 * `I18n` como valor quebra o tipo inteiro do contexto no TypeScript 7.
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    i18n: I18n
  }
}
