import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/cors'

import env from '#start/env'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */

/**
 * A allowlist vem de `CORS_ORIGIN`, separada por vírgula.
 *
 * Ela precisa ser explícita: com `credentials: true` abaixo, o protocolo recusa
 * `*` - o navegador não envia cookie para uma origem curinga. Então ou a origem
 * do frontend está listada, ou não existe sessão entre os dois.
 */
function allowlist() {
  const configured = env.get('CORS_ORIGIN') ?? ''

  return configured
    .split(',')
    .map(function (origin) {
      return origin.trim()
    })
    .filter(Boolean)
}

/**
 * Em desenvolvimento libera qualquer origem, para não exigir configuração de
 * quem só quer subir front e back na própria máquina.
 */
let origin: boolean | string[] = allowlist()
if (app.inDev) origin = true

const corsConfig = defineConfig({
  /**
   * Enable or disable CORS handling globally.
   */
  enabled: true,

  origin,

  /**
   * HTTP methods accepted for cross-origin requests.
   */
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * Os headers que o preflight libera, e não `true`.
   *
   * `true` reflete de volta o que o navegador pediu, seja o que for. A lista
   * explícita é o que faz um header novo entrar por decisão e não por acidente
   * — e é a mesma forma que o lowcodejs usa (`start/kernel.ts:103-125`).
   *
   * `content-type` e `accept` são o mínimo de qualquer requisição JSON;
   * `x-request-id` é o que o log correlaciona.
   */
  headers: ['content-type', 'accept', 'x-request-id'],

  /**
   * Response headers exposed to the browser.
   *
   * `content-disposition` não está entre os headers de resposta simples, então
   * sem esta linha o JavaScript da página lê `null` ao procurá-lo - mesmo com a
   * API mandando o header, e mesmo em desenvolvimento. É por ele que a
   * exportação em CSV descobre o nome do arquivo a salvar.
   */
  exposeHeaders: ['content-disposition'],

  /**
   * Allow cookies/authorization headers on cross-origin requests.
   */
  credentials: true,

  /**
   * Cache CORS preflight response for N seconds.
   */
  maxAge: 90,
})

export default corsConfig
