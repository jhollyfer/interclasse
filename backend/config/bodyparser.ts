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
     * Explicit body ceiling (_standards/backend.md §4.10).
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
     * Explicit body ceiling (_standards/backend.md §4.10).
     */
    limit: '1mb',
  },

  /**
   * No route receives multipart: the upload binary goes straight to the bucket by
   * signed URL and never crosses the API (_standards/backend.md §5.4). Hence
   * `autoProcess: false`: the parser neither reads the body nor writes a temporary file,
   * and an anonymous `multipart/form-data` does not fill the container disk (SEC-2).
   * A route that one day needs to receive a file enters `autoProcess` through a
   * route default, with its own limit
   * (_doc-lib/adonisjs.md#guides/basics/body-parser,
   * https://docs.adonisjs.com/guides/basics/body-parser).
   */
  multipart: {
    autoProcess: false,

    convertEmptyStringsToNull: true,

    /**
     * Body ceiling in case a route starts processing multipart; no effect today.
     */
    limit: '1mb',

    types: ['multipart/form-data'],
  },
})

export default bodyParserConfig
