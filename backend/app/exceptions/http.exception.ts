import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import { type ErrorEnvelope } from '@interclasse/shared'

/**
 * The JSON body every API failure returns, defined once in
 * `core/response.ts`: `status` is the HTTP number and `code` is the machine code.
 */
export type HTTPExceptionPayload = ErrorEnvelope

/**
 * A business failure ready to become an HTTP response.
 *
 * The constructor is `protected` on purpose: instances only through the static
 * factories, which are what pin the status/code pair. A loose `new HTTPException(...)`
 * would let any combination through, and the API error catalog
 * would stop being verifiable by reading this file.
 *
 * The factory signature is positional - `(message, code, errors?)` -, the
 * same in every house project (_standards/backend.md §5).
 *
 * `handle()` makes this exception resolve itself: AdonisJS calls it when
 * the exception rises from a controller, without going through the global handler.
 */
export default class HTTPException extends Exception {
  declare code: string
  errors?: Record<string, string>

  protected constructor(payload: HTTPExceptionPayload) {
    super(payload.message, { status: payload.status, code: payload.code })

    if (payload.errors) {
      this.errors = payload.errors
    }
  }

  /**
   * The response body. `errors` only appears when it exists - an error without per-field
   * detail does not invent an empty key.
   */
  toResponse(): HTTPExceptionPayload {
    const body: HTTPExceptionPayload = {
      message: this.message,
      status: this.status,
      code: this.code,
    }

    if (!this.errors) return body

    return { ...body, errors: this.errors }
  }

  handle(error: this, { response }: HttpContext) {
    return response.status(error.status).send(error.toResponse())
  }

  // 4xx - client errors

  /**
   * The 400 the document generator already described and no factory produced.
   *
   * `app/core/openapi/errors.ts` has had the `400` description all along, but there
   * was no way to emit it: whoever needed to refuse a payload that cannot even be
   * interpreted fell to 422, which is another thing - 422 is "I understood and refuse",
   * 400 is "I could not read it".
   */
  static BadRequest(
    message = 'Requisição inválida',
    code = 'INVALID_PARAMETERS',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 400, code, errors })
  }

  static Unauthorized(
    message = 'Não autorizado',
    code = 'AUTHENTICATION_REQUIRED',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 401, code, errors })
  }

  static Forbidden(
    message = 'Acesso negado',
    code = 'ACCESS_DENIED',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 403, code, errors })
  }

  static NotFound(
    message = 'Recurso não encontrado',
    code = 'RESOURCE_NOT_FOUND',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 404, code, errors })
  }

  static Conflict(
    message = 'Conflito na requisição',
    code = 'CONFLICT_IN_REQUEST',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 409, code, errors })
  }

  /** The resource existed and no longer does, which is different from never having existed. */
  static Gone(message = 'Recurso não está mais disponível', code = 'RESOURCE_GONE'): HTTPException {
    return new HTTPException({ message, status: 410, code })
  }

  /** The condition the request declared no longer holds. */
  static PreconditionFailed(
    message = 'Condição prévia não atendida',
    code = 'PRECONDITION_NOT_MET',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 412, code, errors })
  }

  /**
   * The body passed the ceiling.
   *
   * 413 and not 422: the limit is a transport one, and refusing by size before
   * interpreting is what avoids loading the whole body into memory.
   */
  static PayloadTooLarge(
    message = 'Conteúdo excede o tamanho permitido',
    code = 'PAYLOAD_TOO_LARGE',
  ): HTTPException {
    return new HTTPException({ message, status: 413, code })
  }

  /** The `Content-Type` is not one the route accepts. */
  static UnsupportedMediaType(
    message = 'Formato de conteúdo não suportado',
    code = 'UNSUPPORTED_MEDIA_TYPE',
  ): HTTPException {
    return new HTTPException({ message, status: 415, code })
  }

  /** The resource is in use by another operation and does not accept a write now. */
  static Locked(message = 'Recurso bloqueado', code = 'RESOURCE_LOCKED'): HTTPException {
    return new HTTPException({ message, status: 423, code })
  }

  /**
   * The attempt ceiling blew.
   *
   * `@adonisjs/limiter` emits its own exception on throttled routes; this one
   * exists for the ceiling that is a business rule and not a transport one.
   */
  static TooManyRequests(
    message = 'Tentativas em excesso. Tente novamente mais tarde',
    code = 'TOO_MANY_REQUESTS',
  ): HTTPException {
    return new HTTPException({ message, status: 429, code })
  }

  static UnprocessableEntity(
    message = 'Dados inválidos',
    code = 'UNPROCESSABLE_ENTITY',
    errors?: Record<string, string>,
  ): HTTPException {
    return new HTTPException({ message, status: 422, code, errors })
  }

  // 5xx - server errors

  static InternalServerError(
    message = 'Erro interno do servidor',
    code = 'SERVER_ERROR',
  ): HTTPException {
    return new HTTPException({ message, status: 500, code })
  }

  static ServiceUnavailable(
    message = 'Serviço indisponível',
    code = 'SERVICE_UNAVAILABLE',
  ): HTTPException {
    return new HTTPException({ message, status: 503, code })
  }
  /** The route exists and the path has not been built yet. */
  static NotImplemented(
    message = 'Funcionalidade não implementada',
    code = 'NOT_IMPLEMENTED',
  ): HTTPException {
    return new HTTPException({ message, status: 501, code })
  }

  /** The third party answered, and answered wrong. */
  static BadGateway(
    message = 'Resposta inválida do serviço externo',
    code = 'BAD_GATEWAY',
  ): HTTPException {
    return new HTTPException({ message, status: 502, code })
  }

  /** The third party did not respond in time. */
  static GatewayTimeout(
    message = 'O serviço externo não respondeu a tempo',
    code = 'GATEWAY_TIMEOUT',
  ): HTTPException {
    return new HTTPException({ message, status: 504, code })
  }
}
