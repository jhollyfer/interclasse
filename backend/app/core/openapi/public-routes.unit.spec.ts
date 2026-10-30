import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { test } from '@japa/runner'

/**
 * A rede "vitrine só leitura" (_standards/backend.md §7): rota anônima que não é
 * `GET` só existe se estiver na lista declarada abaixo, e nada sob `/storefront`
 * escreve. Lê o baseline de autorização, que é o que o `authz:check` já cobra
 * contra o `openapi.json`.
 */
const BASELINE: Record<string, string> = JSON.parse(
  readFileSync(join(import.meta.dirname, 'authz-baseline.json'), 'utf-8'),
)
const ANONYMOUS = 'anonima'

/** As escritas anônimas que existem por desenho: entrar e renovar a sessão pelo cookie de refresh. */
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

test.group('rotas públicas (unit)', () => {
  test('rota anônima que não é GET está na lista declarada', ({ assert }) => {
    const writes = routesWhere(
      (route, protection) => protection === ANONYMOUS && !route.startsWith('GET '),
    )

    assert.deepEqual(writes, [...DECLARED_ANONYMOUS_WRITES])
  })

  test('nada sob /storefront escreve', ({ assert }) => {
    const writes = routesWhere(
      (route) => route.includes(' /storefront') && !route.startsWith('GET '),
    )

    assert.deepEqual(writes, [])
  })

  test('a varredura enxerga a vitrine: sem alvo, o guard não guardaria', ({ assert }) => {
    const storefront = routesWhere((route) => route.includes(' /storefront'))

    assert.isAbove(storefront.length, 0)
    assert.isTrue(storefront.every((route) => BASELINE[route] === ANONYMOUS))
  })
})
