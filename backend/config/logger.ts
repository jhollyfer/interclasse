import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, syncDestination, targets } from '@adonisjs/core/logger'

/**
 * O destino síncrono, só fora de produção.
 *
 * Guarda com retorno cedo em vez de ternário: em produção não há destino a
 * montar, e `syncDestination()` é assíncrono - o ternário obrigava um `await`
 * dentro do literal de configuração para um valor que metade dos ambientes
 * descarta.
 */
async function destinoDeDesenvolvimento() {
  if (app.inProduction) return undefined

  return syncDestination()
}

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
       * O nome que aparece em cada registro de log.
       *
       * Literal, e não `env.get('APP_NAME')` como vinha do esqueleto do Adonis:
       * é o nome da aplicação, e ele não muda de ambiente para ambiente -
       * variável de ambiente para um valor fixo é configuração que ninguém
       * escolhe, e que ainda obriga o estágio de build do Dockerfile a
       * inventá-la só para o schema passar.
       */
      name: 'interclasse',

      /**
       * Minimum level to output (trace, debug, info, warn, error, fatal).
       */
      level: env.get('LOG_LEVEL'),

      /**
       * O que nunca sai no log, mesmo que alguém passe o objeto inteiro.
       *
       * Hoje nada aqui loga corpo, header ou cookie — o `logger.error({ err })`
       * dos use-cases leva só o erro. Esta lista não conserta um vazamento
       * existente: ela é a rede para o primeiro `logger.info({ payload })` que
       * alguém escrever, que é quando o vazamento nasce em silêncio.
       *
       * `censor` explícito para o campo aparecer redigido em vez de sumir: um
       * campo ausente lê-se como "não veio", e não como "foi escondido".
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
      destination: await destinoDeDesenvolvimento(),

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
