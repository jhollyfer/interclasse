import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import HTTPException from '#exceptions/http.exception'
import { corsOrigins } from '#config/cors'

/**
 * Os content-types que **não** disparam preflight.
 *
 * Um `<form>` de outra origem envia os dois sem preflight nenhum. Todo o resto
 * da API fala `application/json`, que deixa a requisição de ser "simples" para
 * o CORS e obriga o navegador ao preflight — que bate na allowlist de
 * `config/cors.ts`.
 */
const SIMPLE_CONTENT_TYPES = ['multipart/form-data', 'application/x-www-form-urlencoded']

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * A barreira de CSRF dos content-types que não disparam preflight.
 *
 * Não há token de CSRF, e não é esquecimento: com `Content-Type:
 * application/json` o navegador é obrigado a fazer preflight, e o preflight bate
 * na allowlist de origem. A proteção é **emergente**, e cobre toda a API —
 * menos o que aceita `multipart/form-data` ou
 * `application/x-www-form-urlencoded`, que passam sem preflight.
 *
 * O cookie de sessão viaja junto nessas requisições, que é exatamente a
 * condição de um CSRF. `config/shield.ts` tem `csrf.enabled: false`, então nada
 * mais cobria esse caso.
 *
 * A checagem é do `Origin`, e funciona porque o navegador **sempre** o manda
 * numa escrita cross-site e não deixa a página falsificá-lo. `Origin` ausente é
 * cliente que não é navegador (Postman, mobile, server-side) e segue liberado —
 * a mesma decisão que o `origin` do CORS já toma.
 *
 * Em desenvolvimento não recusa nada, pelo mesmo motivo de `config/cors.ts`
 * liberar qualquer origem ali: não exigir configuração de quem só quer subir
 * front e back na própria máquina.
 */
export default class OriginMiddleware {
  async handle(context: HttpContext, next: NextFn) {
    if (app.inDev) return next()

    if (!WRITE_METHODS.has(context.request.method())) return next()

    const contentType = context.request.header('content-type') ?? ''
    const isSimple = SIMPLE_CONTENT_TYPES.some((type) => contentType.startsWith(type))

    if (!isSimple) return next()

    const origin = context.request.header('origin')

    if (!origin) return next()

    if (corsOrigins.includes(origin)) return next()

    throw HTTPException.Forbidden('Origem não permitida', 'ORIGIN_NOT_ALLOWED')
  }
}
