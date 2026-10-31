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
 * The allowlist comes from `CORS_ORIGINS`, comma-separated, read once here and
 * exported: the origin middleware reads the same list instead of parsing again.
 *
 * It must be explicit: with `credentials: true` below, the protocol refuses
 * `*` - the browser does not send a cookie to a wildcard origin. So either the
 * frontend origin is listed, or there is no session between the two.
 */
export const corsOrigins: ReadonlyArray<string> = (env.get('CORS_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

/**
 * In production the list is required: empty, the origin barrier refuses every
 * write and the frontend does not get in. Starting like that is a configuration error, and the boot
 * stops instead of waiting for the first user (_standards/backend.md §4.10).
 */
if (app.inProduction && corsOrigins.length === 0) {
  throw new Error('CORS_ORIGINS is required in production: list the frontend origins')
}

/**
 * In development it allows any origin, so as not to require configuration from
 * whoever just wants to run front and back on their own machine.
 */
let origin: boolean | string[] = [...corsOrigins]
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
   * The headers the preflight allows, not `true`.
   *
   * `true` reflects back whatever the browser asked for. The
   * explicit list is what makes a new header enter by decision and not by accident.
   *
   * `content-type` and `accept` are the minimum of any JSON request;
   * `x-request-id` is what the log correlates.
   */
  headers: ['content-type', 'accept', 'x-request-id'],

  /**
   * Response headers exposed to the browser.
   *
   * `content-disposition` is not among the simple response headers, so
   * without this line the page JavaScript reads `null` when looking for it - even with the
   * API sending the header, and even in development. It is how the
   * CSV export finds out the file name to save.
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
