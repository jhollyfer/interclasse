import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors as authErrors } from '@adonisjs/auth'
import { errors as bouncerErrors } from '@adonisjs/bouncer'

import { vineErrors } from '#core/validator'
import type { HTTPExceptionPayload } from '#exceptions/http.exception'

type FieldMessage = {
  field: string
  message: string
}

function isFieldMessage(value: unknown): value is FieldMessage {
  if (typeof value !== 'object' || value === null) return false
  if (!('field' in value) || !('message' in value)) return false

  return typeof value.field === 'string' && typeof value.message === 'string'
}

/**
 * O VineJS entrega uma lista de mensagens (`{ field, rule, message }`). Aqui
 * ela é achatada em campo -> mensagem, o mesmo formato que o `errors` do
 * HTTPException usa. A primeira mensagem de cada campo ganha: a tela mostra um
 * erro por campo, e a primeira é a da regra mais externa.
 */
function toFieldErrors(messages: unknown): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!Array.isArray(messages)) return errors

  const list: unknown[] = messages

  for (const item of list) {
    if (!isFieldMessage(item)) continue
    if (errors[item.field]) continue

    errors[item.field] = item.message
  }

  return errors
}

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected override debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  override async handle(error: unknown, ctx: HttpContext) {
    /**
     * Só erros de TERCEIROS são traduzidos aqui, e só estes três: são os que
     * chegam ao cliente com formato próprio e quebrariam o contrato de erro
     * único da API. O HTTPException não passa por aqui - ele se resolve no
     * próprio `handle()`.
     */
    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      const payload: HTTPExceptionPayload = {
        message: 'Dados inválidos',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: toFieldErrors(error.messages),
      }

      return ctx.response.status(payload.status).send(payload)
    }

    if (error instanceof authErrors.E_UNAUTHORIZED_ACCESS) {
      const payload: HTTPExceptionPayload = {
        message: 'Não autorizado',
        status: 401,
        code: 'UNAUTHORIZED',
      }

      return ctx.response.status(payload.status).send(payload)
    }

    /**
     * Negação de policy pelo `ctx.bouncer` (_padroes/backend.md §4.6). A
     * policy diz status e mensagem pela `AuthorizationResponse`, e o
     * identificador de tradução é o `code` estável - o projeto não tem i18n, e
     * o identificador já é a chave que o cliente compara.
     */
    if (error instanceof bouncerErrors.E_AUTHORIZATION_FAILURE) {
      const payload: HTTPExceptionPayload = {
        message: error.response.message ?? 'Acesso negado',
        status: error.response.status ?? 403,
        code: error.response.translation?.identifier ?? 'FORBIDDEN',
      }

      return ctx.response.status(payload.status).send(payload)
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  override async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
