import type { OpenAPIResponse, SchemaObject } from '#core/openapi/types'

/**
 * The failure responses.
 *
 * The API has a single error body - `HTTPExceptionPayload`, in
 * `app/exceptions/http.exception.ts` - and that is what comes out of here. What varies between
 * one failure and another is the `code`, and the `code` is exactly what the client uses to
 * decide what to do. So each status becomes a schema with the `code`
 * restricted by `enum` to the values that operation really returns: the failure
 * list is exhaustive instead of decorative.
 *
 * When the operation declares no code for a status, the `code` comes out as a
 * free string. An empty enum would be a lie, and an invented enum would be worse.
 */

/** Named because `forbiddenDescription` composes it without going through the index. */
const FORBIDDEN_DESCRIPTION = 'Access denied'

const DESCRIPTIONS: Record<number, string> = {
  400: 'Invalid request',
  401: 'Not authenticated',
  403: FORBIDDEN_DESCRIPTION,
  404: 'Resource not found',
  409: 'Conflict with the current state',
  422: 'Payload rejected by validation',
  500: 'Internal server error',
}

/**
 * The per-field `errors` only exists on a validation failure and on a uniqueness
 * conflict. Declaring it required where it does not come would make the client treat
 * its absence as an error.
 */
const REQUIRES_FIELD_ERRORS = 422

/**
 * Name of the component that describes a failure.
 *
 * The error body is always the same; what changes is the `code` `enum`. Naming by the
 * status plus the codes makes operations that fail the same way share a single
 * component - the document shrinks, and whoever generates a typed client gets a type
 * named per failure instead of an anonymous object repeated in every endpoint.
 */
export function errorComponentName(status: number, codes: string[]): string {
  const suffix = [...codes]
    .sort()
    .map((code) =>
      code
        .split('_')
        .filter(Boolean)
        .map(function (part) {
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        })
        .join(''),
    )
    .join('')

  return `Error${status}${suffix}`
}

export function errorSchema(status: number, codes: string[]): SchemaObject {
  const code: SchemaObject = { type: 'string', description: 'Machine identifier of the failure.' }

  if (codes.length > 0) {
    code.enum = [...codes].sort()
  }

  const required = ['message', 'status', 'code']

  if (status === REQUIRES_FIELD_ERRORS) required.push('errors')

  return {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Message in Portuguese, displayable to the user.' },
      status: { type: 'integer', enum: [status] },
      code,
      errors: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: 'Message per field, when the failure is attributable to payload fields.',
      },
    },
    required,
  }
}

export function errorResponse(
  status: number,
  reference: string,
  description?: string,
): OpenAPIResponse {
  return {
    description: description ?? DESCRIPTIONS[status] ?? 'Failure',
    content: { 'application/json': { schema: { $ref: reference } } },
  }
}

// ---------------------------------------------------------------------------
// Automatic failures
// ---------------------------------------------------------------------------

/**
 * Codes that come from no use case: they are produced by the middleware or by the
 * global handler, and so hold for every route that goes through them. No
 * controller needs to declare them.
 */
export const AUTOMATIC_CODES = {
  /** `HttpExceptionHandler` translates the guard's `E_UNAUTHORIZED_ACCESS`. */
  unauthenticated: 'AUTHENTICATION_REQUIRED',
  /** `role.middleware.ts` refuses the role. */
  forbidden: 'ACCESS_DENIED',
  /** `HttpExceptionHandler` translates VineJS's `E_VALIDATION_ERROR`. */
  validation: 'VALIDATION_ERROR',
} as const

export function forbiddenDescription(roles: string[]): string {
  if (roles.length === 0) return FORBIDDEN_DESCRIPTION

  return `${FORBIDDEN_DESCRIPTION}. Requires one of these roles: ${roles.join(', ')}.`
}
