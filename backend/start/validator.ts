/**
 * O boot só garante que o `vine` configurado foi carregado antes da primeira
 * requisição. A configuração - mensagens pt-BR, rótulos de campo e o transform
 * de data - mora em `app/core/validator.ts` (_standards/backend.md §4.4).
 */
import { RequestValidator } from '@adonisjs/core/http'
import { BASE_LOCALE, LOCALES } from '@interclasse/shared'

import { VALIDATION_MESSAGES } from '#core/validator'

/**
 * As mensagens do VineJS no idioma da requisição: o middleware de idioma já pôs
 * o tradutor em `ctx.i18n`, e daqui sai o provider do mesmo idioma
 * (_doc-lib/vinejs.md#custom_error_messages). Fora de requisição vale o
 * provider base, que `#core/validator` instala.
 */
RequestValidator.messagesProvider = (ctx) =>
  VALIDATION_MESSAGES[LOCALES.find((locale) => locale === ctx.i18n.locale) ?? BASE_LOCALE]
