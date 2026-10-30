import app from '@adonisjs/core/services/app'
import i18nManager from '@adonisjs/i18n/services/main'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors as authErrors } from '@adonisjs/auth'
import { errors as bouncerErrors } from '@adonisjs/bouncer'
import { errors as limiterErrors } from '@adonisjs/limiter'
import { BASE_LOCALE } from '@interclasse/shared'

import { vineErrors } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import type { HTTPExceptionPayload } from '#exceptions/http.exception'

type ThrottleError = InstanceType<typeof limiterErrors.E_TOO_MANY_REQUESTS>

type FieldMessage = {
  readonly field: string
  readonly message: string
}

/**
 * O handler global único (_standards/backend.md §5.5).
 *
 * Só `HTTPException` e erro de validação saem com a própria mensagem. Os erros de
 * terceiros que chegam ao cliente com formato próprio (VineJS, guard, bouncer,
 * limiter) viram o envelope `{ message, status, code }` da API, e qualquer
 * outro erro de status 5xx vira o 500 genérico: o renderer padrão do Adonis
 * repassa `error.message` cru, e a mensagem de driver traz tabela, coluna e
 * constraint (_doc-lib/adonisjs.md#guides/basics/exception-handling,
 * https://docs.adonisjs.com/guides/basics/exception-handling).
 */
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
    // O HTTPException se resolve no próprio `handle()`, com a mensagem que o
    // use-case já traduziu.
    if (error instanceof HTTPException) return super.handle(error, ctx)

    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      return this.send(ctx, this.validationPayload(error.messages, ctx))
    }

    if (error instanceof authErrors.E_UNAUTHORIZED_ACCESS) {
      const exception = HTTPException.Unauthorized(this.translate(ctx, 'errors.unauthorized'))

      return this.send(ctx, exception.toResponse())
    }

    /**
     * Negação de policy pelo `ctx.bouncer` (_standards/backend.md §4.6). A
     * policy diz status e mensagem pela `AuthorizationResponse`, e o
     * identificador de tradução é o `code` estável.
     */
    if (error instanceof bouncerErrors.E_AUTHORIZATION_FAILURE) {
      return this.send(ctx, {
        message: error.response.message ?? this.translate(ctx, 'errors.access_denied'),
        status: error.response.status ?? 403,
        code: error.response.translation?.identifier ?? 'ACCESS_DENIED',
      })
    }

    if (error instanceof limiterErrors.E_TOO_MANY_REQUESTS) {
      return this.tooManyRequests(error, ctx)
    }

    if (this.isServerError(error)) {
      const exception = HTTPException.InternalServerError(this.translate(ctx, 'errors.internal'))

      return this.send(ctx, exception.toResponse())
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

  private send(ctx: HttpContext, payload: HTTPExceptionPayload) {
    return ctx.response.status(payload.status).send(payload)
  }

  /**
   * O 429 do limiter no envelope da API, com `code` estável. O bloqueio vai para o
   * log com a tag da rota e os números do limite, sem e-mail nem corpo: a chave
   * por conta carrega o e-mail e não sai daqui (_standards/backend.md §4.10 e
   * §5.5). Pico desta linha é sinal de ataque.
   */
  private tooManyRequests(error: ThrottleError, ctx: HttpContext) {
    ctx.logger.warn(
      {
        route: ctx.route?.pattern,
        method: ctx.request.method(),
        ip: ctx.request.ip(),
        limit: error.response.limit,
        retryAfter: error.response.availableIn,
      },
      '[security > rate_limited] teto de tentativas estourado',
    )

    const exception = HTTPException.TooManyRequests(this.translate(ctx, 'errors.too_many_requests'))

    ctx.response
      .header('X-RateLimit-Limit', String(error.response.limit))
      .header('X-RateLimit-Remaining', String(error.response.remaining))
      .header('Retry-After', String(error.response.availableIn))

    return this.send(ctx, exception.toResponse())
  }

  /**
   * O VineJS entrega uma lista de mensagens (`{ field, rule, message }`). Aqui
   * ela é achatada em campo -> mensagem, o mesmo formato que o `errors` do
   * HTTPException usa. A primeira mensagem de cada campo ganha: a tela mostra um
   * erro por campo, e a primeira é a da regra mais externa.
   */
  private validationPayload(messages: unknown, ctx: HttpContext): HTTPExceptionPayload {
    return HTTPException.UnprocessableEntity(
      this.translate(ctx, 'errors.validation'),
      'VALIDATION_ERROR',
      this.toFieldErrors(messages),
    ).toResponse()
  }

  private toFieldErrors(messages: unknown): Record<string, string> {
    const errors: Record<string, string> = {}

    if (!Array.isArray(messages)) return errors

    const list: unknown[] = messages

    for (const item of list) {
      if (!this.isFieldMessage(item)) continue
      if (errors[item.field]) continue

      errors[item.field] = item.message
    }

    return errors
  }

  private isFieldMessage(value: unknown): value is FieldMessage {
    if (typeof value !== 'object' || value === null) return false
    if (!('field' in value) || !('message' in value)) return false

    return typeof value.field === 'string' && typeof value.message === 'string'
  }

  /** Erro sem status é 500, como o Adonis o trata. */
  private isServerError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return true
    if (!('status' in error) || typeof error.status !== 'number') return true

    return error.status >= 500
  }

  /**
   * O idioma de quem pediu. O tradutor da requisição só existe depois do
   * middleware de idioma; um erro de antes dele (rota inexistente, falha de
   * middleware de servidor) cai aqui sem `ctx.i18n`.
   */
  private translate(ctx: HttpContext, key: string): string {
    const language = i18nManager.getSupportedLocaleFor(ctx.request.languages())

    return i18nManager.locale(language ?? BASE_LOCALE).t(key)
  }
}
