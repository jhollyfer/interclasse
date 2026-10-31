import app from '@adonisjs/core/services/app'
import { defineConfig, syncDestination, targets } from '@adonisjs/core/logger'

import env from '#start/env'

/**
 * The synchronous destination, only outside production: in production there is no destination to build,
 * and `syncDestination()` is asynchronous - the ternary forced an `await` inside the
 * configuration literal for a value that half the environments discard.
 */
let destination: Awaited<ReturnType<typeof syncDestination>> | undefined
if (!app.inProduction) destination = await syncDestination()

const loggerConfig = defineConfig({
  /**
   * Default logger name used by ctx.logger and app logger calls.
   */
  default: 'app',

  loggers: {
    app: {
      /**
       * Toggle this logger on/off.
       */
      enabled: true,

      /**
       * The name that appears in every log record.
       *
       * Literal, and not `env.get('APP_NAME')` as it came from the Adonis skeleton:
       * it is the application name, and it does not change from environment to environment -
       * an environment variable for a fixed value is configuration nobody
       * chooses, and that still forces the Dockerfile build stage to
       * invent it just so the schema passes.
       */
      name: 'interclasse',

      /**
       * Minimum level to output (trace, debug, info, warn, error, fatal).
       */
      level: env.get('LOG_LEVEL'),

      /**
       * What never goes into the log, even if someone passes the whole object.
       *
       * Today nothing here logs body, header or cookie — the use cases'
       * `logger.error({ err })` carries only the error. This list does not fix an
       * existing leak: it is the net for the first `logger.info({ payload })` that
       * someone writes, which is when the leak is born silently.
       *
       * Explicit `censor` so the field shows up redacted instead of vanishing: an
       * absent field reads as "did not come", not as "was hidden".
       */
      redact: {
        paths: [
          'password',
          'currentPassword',
          'passwordConfirmation',
          '*.password',
          '*.currentPassword',
          'token',
          'accessToken',
          'refreshToken',
          '*.token',
          'authorization',
          'cookie',
          'req.headers.authorization',
          'req.headers.cookie',
          'headers.authorization',
          'headers.cookie',
        ],
        censor: '[redigido]',
      },

      /**
       * Use sync destination in non-production for immediate flush.
       */
      destination: destination,

      /**
       * Configure where logs are written.
       */
      transport: {
        targets: [targets.file({ destination: 1 })],
      },
    },
  },
})

export default loggerConfig

/**
 * Inferring types for the list of loggers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  export interface LoggersList extends InferLoggers<typeof loggerConfig> {}
}
