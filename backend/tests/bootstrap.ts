import { assert } from '@japa/assert'
import { ApiClient, apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { disallowPinnedTests } from '@japa/runner/plugins'
import { spec } from '@japa/runner/reporters'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { dbAssertions } from '@adonisjs/lucid/plugins/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'

import type { Registry } from '../.adonisjs/client/registry/schema.d.ts'

import env from '#start/env'
import { DatabaseGuard } from '#tests/database-guard'

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
 * The test client is not a browser and does not send `Origin`; the origin barrier
 * (`origin.middleware.ts`) would refuse every write. Every request goes out as if it
 * came from the allowlisted frontend of `.env.test`; the test that measures the
 * refusal sets its own `Origin`.
 */
ApiClient.setup((request) => {
  // The hook runs at send time, after the test's `.header()`: it only fills in when missing.
  if (request.request.get('origin')) return

  request.header('origin', 'http://localhost:5173')
})

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  // A forgotten `.pin()` makes CI run only the pinned test and stay green
  // (_doc-lib/japa.md#docs/filtering-tests): in CI the run fails.
  disallowPinnedTests({ disallow: process.env.CI === 'true' }),
  assert(),
  pluginAdonisJS(app),
  dbAssertions(app),
  apiClient(),
  authApiClient(app),
]

/**
 * Reporters. Japa ships no TAP reporter, and the specification audit engine reads
 * exactly `ok N - title` / `not ok N - title` to know which acceptance criteria
 * passed.
 *
 * Enabled by `ONP_TAP=1` instead of `--reporter=tap`: an environment variable crosses
 * `node ace test` without depending on flag forwarding.
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

            // Skipped is not proof: it comes out as `ok ... # SKIP`, which the engine
            // recognizes and refuses as evidence.
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
  // Before any suite and the first migration: a database without `_test` brings the runner down.
  setup: [() => DatabaseGuard.assertTestDatabase(env.get('DATABASE_URL'))],
  teardown: [],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  // Only the suite that talks to the database and HTTP starts them: `unit` runs
  // without either (_standards/architecture.md §8). Migrations run once, before the
  // suite: without that the schema would only appear as a side effect of the
  // `truncate()` in `resetDatabase()`, and specs that do not call it would have no
  // table in a freshly created database.
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    suite.setup(() => testUtils.db().migrate())
    suite.setup(() => testUtils.httpServer().start())
  }
}
