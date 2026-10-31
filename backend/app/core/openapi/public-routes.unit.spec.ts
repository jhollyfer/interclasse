import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { test } from '@japa/runner'

/**
 * The "read-only storefront" net (_standards/backend.md §7): an anonymous route that is not
 * `GET` only exists if it is in the list declared below, and nothing under `/storefront`
 * writes. It reads the authorization baseline, which is what `authz:check` already enforces
 * against `openapi.json`.
 */
const BASELINE: Record<string, string> = JSON.parse(
  readFileSync(join(import.meta.dirname, 'authz-baseline.json'), 'utf-8'),
)
const ANONYMOUS = 'anonymous'

/** The anonymous writes that exist by design: signing in and renewing the session through the refresh cookie. */
const DECLARED_ANONYMOUS_WRITES = [
  'POST /authentication/refresh',
  'POST /authentication/sign-in',
] as const

function routesWhere(predicate: (route: string, protection: string) => boolean): string[] {
  return Object.entries(BASELINE)
    .filter(([route, protection]) => predicate(route, protection))
    .map(([route]) => route)
    .sort()
}

test.group('public routes (unit)', () => {
  test('an anonymous route that is not GET is in the declared list', ({ assert }) => {
    const writes = routesWhere(
      (route, protection) => protection === ANONYMOUS && !route.startsWith('GET '),
    )

    assert.deepEqual(writes, [...DECLARED_ANONYMOUS_WRITES])
  })

  test('nothing under /storefront writes', ({ assert }) => {
    const writes = routesWhere(
      (route) => route.includes(' /storefront') && !route.startsWith('GET '),
    )

    assert.deepEqual(writes, [])
  })

  test('the scan sees the storefront: without a target, the guard would not guard', ({
    assert,
  }) => {
    const storefront = routesWhere((route) => route.includes(' /storefront'))

    assert.isAbove(storefront.length, 0)
    assert.isTrue(storefront.every((route) => BASELINE[route] === ANONYMOUS))
  })
})
