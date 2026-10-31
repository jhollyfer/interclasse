import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { test } from '@japa/runner'

/**
 * A spec dos scripts de guard-rail (_standards/backend.md §7 e §10): sem container,
 * cada script roda como processo e a spec lê o código de saída e o relatório.
 * `authz-check` tem o caso de recusa; `pattern-check` roda sobre o repositório
 * real, que precisa estar limpo.
 */
const BACKEND = join(import.meta.dirname, '..')
const BASELINE = join(BACKEND, 'app/core/openapi/authz-baseline.json')
const TS_EXEC = ['--import', '@poppinss/ts-exec']

type Run = { readonly status: number | null; readonly output: string }

/** Roda um script do backend e devolve o código de saída e tudo o que ele imprimiu. */
function runScript(script: string, env: Record<string, string> = {}): Run {
  const result = spawnSync(process.execPath, [...TS_EXEC, join(BACKEND, 'scripts', script)], {
    cwd: BACKEND,
    env: { ...process.env, ...env },
    encoding: 'utf-8',
  })

  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

/** Grava um baseline alterado num diretório temporário e devolve o caminho dele. */
function tamperedBaseline(change: (baseline: Record<string, string>) => void): {
  readonly path: string
  readonly cleanup: () => void
} {
  const directory = mkdtempSync(join(tmpdir(), 'authz-'))
  const baseline: Record<string, string> = JSON.parse(readFileSync(BASELINE, 'utf-8'))
  change(baseline)
  const path = join(directory, 'authz-baseline.json')
  writeFileSync(path, JSON.stringify(baseline))

  return { path, cleanup: () => rmSync(directory, { recursive: true, force: true }) }
}

test.group('scripts > authz-check (unit)', () => {
  test('o baseline commitado confere com o openapi.json', ({ assert }) => {
    const run = runScript('authz-check.ts')

    assert.equal(run.status, 0, run.output)
    assert.include(run.output, 'no changes')
  })

  test('rota que passou a ser pública reprova e aparece no relatório', ({ assert }) => {
    const tampered = tamperedBaseline((baseline) => {
      baseline['GET /storefront/site'] = 'ADMINISTRATOR'
    })

    try {
      const run = runScript('authz-check.ts', { AUTHZ_BASELINE: tampered.path })

      assert.equal(run.status, 1)
      assert.include(run.output, 'GET /storefront/site')
    } finally {
      tampered.cleanup()
    }
  })

  test('rota nova fora do baseline reprova', ({ assert }) => {
    const tampered = tamperedBaseline((baseline) => {
      delete baseline['GET /storefront/site']
    })

    try {
      const run = runScript('authz-check.ts', { AUTHZ_BASELINE: tampered.path })

      assert.equal(run.status, 1)
      assert.include(run.output, '+ GET /storefront/site')
    } finally {
      tampered.cleanup()
    }
  })

  test('baseline ausente reprova em vez de passar calado', ({ assert }) => {
    const run = runScript('authz-check.ts', { AUTHZ_BASELINE: join(tmpdir(), 'nao-existe.json') })

    assert.equal(run.status, 1)
    assert.include(run.output, 'baseline missing')
  })
})

test.group('scripts > pattern-check (unit)', () => {
  test('o repositório cumpre a árvore, os nomes e o ENV', ({ assert }) => {
    const run = runScript('pattern-check.ts')

    assert.equal(run.status, 0, run.output)
  })
})
