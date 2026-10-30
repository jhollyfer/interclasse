import { defineConfig } from '@adonisjs/core/bodyparser'

const bodyParserConfig = defineConfig({
  /**
   * Parse request bodies for these HTTP methods.
   * Keep this aligned with methods that receive payloads in your routes.
   */
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * Config for the "application/x-www-form-urlencoded"
   * content-type parser.
   */
  form: {
    /**
     * Normalize empty string values to null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Content types handled by the form parser.
     */
    types: ['application/x-www-form-urlencoded'],

    /**
     * Teto do corpo, explícito (_standards/backend.md §4.10).
     */
    limit: '1mb',
  },

  /**
   * Config for the JSON parser.
   */
  json: {
    /**
     * Normalize empty string values to null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Content types handled by the JSON parser.
     */
    types: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ],

    /**
     * Teto do corpo, explícito (_standards/backend.md §4.10).
     */
    limit: '1mb',
  },

  /**
   * Nenhuma rota recebe multipart: o binário do upload vai direto ao bucket por
   * URL assinada e nunca atravessa a API (_standards/backend.md §5.4). Por isso
   * `autoProcess: false`: o parser não lê o corpo nem grava arquivo temporário,
   * e um `multipart/form-data` anônimo não enche o disco do container (SEC-2).
   * Rota que um dia precisar receber arquivo entra em `autoProcess` por padrão
   * de rota, com limite próprio
   * (_doc-lib/adonisjs.md#guides/basics/body-parser,
   * https://docs.adonisjs.com/guides/basics/body-parser).
   */
  multipart: {
    autoProcess: false,

    convertEmptyStringsToNull: true,

    /**
     * Teto de corpo caso uma rota passe a processar multipart; hoje sem efeito.
     */
    limit: '1mb',

    types: ['multipart/form-data'],
  },
})

export default bodyParserConfig
