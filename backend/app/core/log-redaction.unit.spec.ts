import { Writable } from 'node:stream'

import { test } from '@japa/runner'
import { LoggerManager } from '@adonisjs/core/logger'

import loggerConfig from '#config/logger'

/**
 * The spec that proves log redaction (_standards/backend.md §7): it logs the body of
 * a sign-in with the password and asserts it does not appear. The logger is the one from
 * the project configuration, with only the destination swapped for a collector.
 */
class Sink extends Writable {
  readonly lines: string[] = []

  override _write(chunk: Buffer, _encoding: string, done: () => void): void {
    this.lines.push(chunk.toString('utf-8'))
    done()
  }

  get output(): string {
    return this.lines.join('')
  }
}

function collectingLogger(sink: Sink) {
  const config = { ...loggerConfig.loggers.app, transport: undefined, destination: sink }

  return new LoggerManager({ default: 'app', loggers: { app: config } }).use('app')
}

test.group('config > logger > redaction (unit)', () => {
  test('the body password does not reach the log, even nested', ({ assert }) => {
    const sink = new Sink()

    collectingLogger(sink).info(
      { payload: { email: 'ana@mail.com', password: 'Segredo123!' }, password: 'Segredo123!' },
      'sign-in',
    )

    assert.notInclude(sink.output, 'Segredo123!')
    assert.include(sink.output, '[redigido]')
  })

  test('token, cookie and authorization come out redacted', ({ assert }) => {
    const sink = new Sink()

    collectingLogger(sink).info(
      {
        accessToken: 'oat_segredo',
        refreshToken: 'ort_segredo',
        authorization: 'Bearer segredo',
        req: { headers: { cookie: 'access-token=segredo' } },
      },
      'requisição',
    )

    assert.notInclude(sink.output, 'segredo')
  })

  test('what is not a secret stays in the log', ({ assert }) => {
    const sink = new Sink()

    collectingLogger(sink).info({ email: 'ana@mail.com' }, 'sign-in')

    assert.include(sink.output, 'ana@mail.com')
  })
})
