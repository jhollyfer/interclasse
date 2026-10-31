/**
 * Boot only guarantees that the configured `vine` was loaded before the first
 * request. The configuration - pt-BR messages, field labels and the date
 * transform - lives in `app/core/validator.ts` (_standards/backend.md §4.4).
 */
import { RequestValidator } from '@adonisjs/core/http'
import { BASE_LOCALE, LOCALES } from '@interclasse/shared'

import { VALIDATION_MESSAGES } from '#core/validator'

/**
 * VineJS messages in the request language: the language middleware already put
 * the translator in `ctx.i18n`, and from it comes the provider of the same language
 * (_doc-lib/vinejs.md#custom_error_messages). Outside a request the
 * base provider applies, which `#core/validator` installs.
 */
RequestValidator.messagesProvider = (ctx) =>
  VALIDATION_MESSAGES[LOCALES.find((locale) => locale === ctx.i18n.locale) ?? BASE_LOCALE]
