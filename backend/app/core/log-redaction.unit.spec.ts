import { Writable } from 'node:stream'

import { test } from '@japa/runner'
import { LoggerManager } from '@adonisjs/core/logger'

import loggerConfig from '#config/logger'

/**
 * A spec que prova a redação de log (_standards/backend.md §7): loga o corpo de
 * um sign-in com a senha e afirma que ela não aparece. O logger é o da
 * configuração do projeto, só com o destino trocado por um coletor.
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

test.group('config > logger > redação (unit)', () => {
  test('a senha do corpo não sai no log, nem aninhada', ({ assert }) => {
    const sink = new Sink()

    collectingLogger(sink).info(
      { payload: { email: 'ana@mail.com', password: 'Segredo123!' }, password: 'Segredo123!' },
      'sign-in',
    )

    assert.notInclude(sink.output, 'Segredo123!')
    assert.include(sink.output, '[redigido]')
  })

  test('token, cookie e authorization saem redigidos', ({ assert }) => {
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

  test('o que não é segredo continua no log', ({ assert }) => {
    const sink = new Sink()

    collectingLogger(sink).info({ email: 'ana@mail.com' }, 'sign-in')

    assert.include(sink.output, 'ana@mail.com')
  })
})
