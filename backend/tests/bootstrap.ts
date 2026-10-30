import { assert } from '@japa/assert'
import { ApiClient, apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { spec } from '@japa/runner/reporters'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { dbAssertions } from '@adonisjs/lucid/plugins/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'

import type { Registry } from '../.adonisjs/client/registry/schema.d.ts'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */
declare module '@japa/api-client/types' {
  interface RoutesRegistry extends Registry {}
}

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * O cliente de teste não é um navegador e não manda `Origin`; a barreira de
 * origem (`origin.middleware.ts`) recusaria toda escrita. Todo pedido sai como
 * se viesse do frontend da allowlist de `.env.test`; o teste que mede a recusa
 * põe a própria `Origin`.
 */
ApiClient.setup((request) => {
  // O hook roda no envio, depois do `.header()` do teste: só preenche quando falta.
  if (request.request.get('origin')) return

  request.header('origin', 'http://localhost:5173')
})

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),
  dbAssertions(app),
  apiClient(),
  authApiClient(app),
]

/**
 * Reporters. Japa não traz um reporter TAP, e o motor de auditoria da
 * especificação lê exatamente `ok N - título` / `not ok N - título` para saber
 * quais critérios de aceite passaram.
 *
 * Ativado por `ONP_TAP=1` em vez de `--reporter=tap`: variável de ambiente
 * atravessa o `node ace test` sem depender de repasse de flag.
 */
const REPORTERS = {
  spec: { activated: ['spec'], list: [spec()] },
  tap: {
    activated: ['tap'],
    list: [
      {
        name: 'tap',
        handler: (_runner, emitter) => {
          let count = 0

          emitter.on('runner:start', () => console.log('TAP version 13'))

          emitter.on('test:end', (test) => {
            count += 1
            const title = test.title.expanded

            // Pulado não é prova: sai como `ok ... # SKIP`, que o motor
            // reconhece e recusa como evidência.
            if (test.isTodo) {
              console.log(`ok ${count} - ${title} # TODO`)
              return
            }

            if (test.isSkipped) {
              console.log(`ok ${count} - ${title} # SKIP ${test.skipReason ?? ''}`.trimEnd())
              return
            }

            if (test.hasError) {
              console.log(`not ok ${count} - ${title}`)

              for (const { error } of test.errors) {
                console.log(`  # ${error.message.split('\n').join('\n  # ')}`)
              }

              return
            }

            console.log(`ok ${count} - ${title}`)
          })

          emitter.on('runner:end', () => console.log(`1..${count}`))
        },
      },
    ],
  },
} satisfies Record<string, Config['reporters']>

let reporterMode: keyof typeof REPORTERS = 'spec'
if (process.env.ONP_TAP === '1') reporterMode = 'tap'

export const reporters: Config['reporters'] = REPORTERS[reporterMode]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [],
  teardown: [],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  // Só a suíte que fala com banco e HTTP os sobe: a `unit` roda sem nenhum dos
  // dois (_standards/architecture.md §8). As migrations rodam uma vez, antes da
  // suíte: sem isso o esquema só nasceria como efeito colateral do `truncate()`
  // de `resetDatabase()`, e as specs que não o chamam não teriam tabela num
  // banco recém-criado.
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    suite.setup(() => testUtils.db().migrate())
    suite.setup(() => testUtils.httpServer().start())
  }
}
