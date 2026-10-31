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
 * The single global handler (_standards/backend.md §5.5).
 *
 * Only `HTTPException` and validation errors come out with their own message. Third-party
 * errors that reach the client in their own format (VineJS, guard, bouncer,
 * limiter) become the API `{ message, status, code }` envelope, and any
 * other 5xx error becomes the generic 500: Adonis' default renderer
 * passes `error.message` through raw, and a driver message carries table, column and
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
    // HTTPException resolves itself in its own `handle()`, with the message the
    // use case already translated.
    if (error instanceof HTTPException) return super.handle(error, ctx)

    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      return this.send(ctx, this.validationPayload(error.messages, ctx))
    }

    if (error instanceof authErrors.E_UNAUTHORIZED_ACCESS) {
      const exception = HTTPException.Unauthorized(this.translate(ctx, 'errors.unauthorized'))

      return this.send(ctx, exception.toResponse())
    }

    /**
     * Policy denial through `ctx.bouncer` (_standards/backend.md §4.6). The
     * policy gives status and message through the `AuthorizationResponse`, and the
     * translation identifier is the stable `code`.
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
   * The limiter's 429 in the API envelope, with a stable `code`. The block goes to the
   * log with the route tag and the limit numbers, without e-mail or body: the per-account
   * key carries the e-mail and does not leave here (_standards/backend.md §4.10 and
   * §5.5). A spike on this line is a sign of attack.
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
      '[security > rate_limited] attempt ceiling exceeded',
    )

    const exception = HTTPException.TooManyRequests(this.translate(ctx, 'errors.too_many_requests'))

    ctx.response
      .header('X-RateLimit-Limit', String(error.response.limit))
      .header('X-RateLimit-Remaining', String(error.response.remaining))
      .header('Retry-After', String(error.response.availableIn))

    return this.send(ctx, exception.toResponse())
  }

  /**
   * VineJS delivers a list of messages (`{ field, rule, message }`). Here
   * it is flattened into field -> message, the same format the HTTPException `errors`
   * uses. The first message of each field wins: the screen shows one
   * error per field, and the first is that of the outermost rule.
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

  /** An error without status is 500, as Adonis treats it. */
  private isServerError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return true
    if (!('status' in error) || typeof error.status !== 'number') return true

    return error.status >= 500
  }

  /**
   * The language of whoever asked. The request translator only exists after the
   * language middleware; an error from before it (nonexistent route, server
   * middleware failure) falls here without `ctx.i18n`.
   */
  private translate(ctx: HttpContext, key: string): string {
    const language = i18nManager.getSupportedLocaleFor(ctx.request.languages())

    return i18nManager.locale(language ?? BASE_LOCALE).t(key)
  }
}
