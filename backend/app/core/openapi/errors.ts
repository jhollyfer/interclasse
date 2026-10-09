import type { OpenAPIResponse, SchemaObject } from './types.ts'

/**
 * As respostas de falha.
 *
 * A API tem um corpo de erro só - `HTTPExceptionPayload`, em
 * `app/exceptions/http.exception.ts` - e é ele que sai daqui. O que varia entre
 * uma falha e outra é o `code`, e é justamente o `code` que o cliente usa para
 * decidir o que fazer. Por isso cada status vira um schema com o `code`
 * restrito por `enum` aos valores que aquela operação realmente devolve: a lista
 * de falhas fica exaustiva em vez de decorativa.
 *
 * Quando a operação não declara code nenhum para um status, o `code` sai como
 * string livre. Enum vazio seria mentira, e enum inventado seria pior.
 */

const DESCRIPTIONS: Record<number, string> = {
  400: 'Requisição inválida',
  401: 'Não autenticado',
  403: 'Acesso negado',
  404: 'Recurso não encontrado',
  409: 'Conflito com o estado atual',
  422: 'Payload recusado pela validação',
  500: 'Erro interno do servidor',
}

/**
 * O `errors` por campo só existe em falha de validação e em conflito de
 * unicidade. Declará-lo obrigatório onde ele não vem faria o cliente tratar
 * ausência como erro.
 */
const REQUIRES_FIELD_ERRORS = 422

/**
 * Nome do componente que descreve uma falha.
 *
 * O corpo do erro é sempre o mesmo; o que muda é o `enum` do `code`. Nomear pelo
 * status mais os códigos faz operações que falham igual compartilharem um
 * componente só - o documento encolhe, e quem gera cliente tipado ganha um tipo
 * nomeado por falha em vez de um objeto anônimo repetido em cada endpoint.
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
        .join('')
    )
    .join('')

  return `Error${status}${suffix}`
}

export function errorSchema(status: number, codes: string[]): SchemaObject {
  const code: SchemaObject = { type: 'string', description: 'Identificador de máquina da falha.' }

  if (codes.length > 0) {
    code.enum = [...codes].sort()
  }

  const required = ['message', 'status', 'code']

  if (status === REQUIRES_FIELD_ERRORS) required.push('errors')

  return {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Mensagem em português, exibível ao usuário.' },
      status: { type: 'integer', enum: [status] },
      code,
      errors: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: 'Mensagem por campo, quando a falha é atribuível a campos do payload.',
      },
    },
    required,
  }
}

export function errorResponse(
  status: number,
  reference: string,
  description?: string
): OpenAPIResponse {
  return {
    description: description ?? DESCRIPTIONS[status] ?? 'Falha',
    content: { 'application/json': { schema: { $ref: reference } } },
  }
}

// ---------------------------------------------------------------------------
// Falhas automáticas
// ---------------------------------------------------------------------------

/**
 * Códigos que não vêm de nenhum use-case: são produzidos pelo middleware ou pelo
 * handler global, e por isso valem para toda rota que passe por eles. Nenhum
 * controller precisa declará-los.
 */
export const AUTOMATIC_CODES = {
  /** `HttpExceptionHandler` traduz `E_UNAUTHORIZED_ACCESS` do guard. */
  unauthenticated: 'UNAUTHORIZED',
  /** `role_middleware.ts` recusa o papel. */
  forbidden: 'ACCESS_DENIED',
  /** `HttpExceptionHandler` traduz `E_VALIDATION_ERROR` do VineJS. */
  validation: 'VALIDATION_ERROR',
} as const

export function forbiddenDescription(roles: string[]): string {
  if (roles.length === 0) return DESCRIPTIONS[403]

  return `${DESCRIPTIONS[403]}. Exige um destes papéis: ${roles.join(', ')}.`
}
