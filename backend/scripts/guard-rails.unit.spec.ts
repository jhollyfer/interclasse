import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { test } from '@japa/runner'

/**
 * The spec of the guard-rail scripts (_standards/backend.md §7 and §10): no container,
 * each script runs as a process and the spec reads the exit code and the report.
 * `authz-check` has the refusal case; `pattern-check` runs over the real
 * repository, which must be clean.
 */
const BACKEND = join(import.meta.dirname, '..')
const BASELINE = join(BACKEND, 'app/core/openapi/authz-baseline.json')
const TS_EXEC = ['--import', '@poppinss/ts-exec']

type Run = { readonly status: number | null; readonly output: string }

/** Runs a backend script and returns the exit code and everything it printed. */
function runScript(script: string, env: Record<string, string> = {}): Run {
  const result = spawnSync(process.execPath, [...TS_EXEC, join(BACKEND, 'scripts', script)], {
    cwd: BACKEND,
    env: { ...process.env, ...env },
    encoding: 'utf-8',
  })

  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

/** Writes a changed baseline in a temporary directory and returns its path. */
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
  test('the committed baseline matches openapi.json', ({ assert }) => {
    const run = runScript('authz-check.ts')

    assert.equal(run.status, 0, run.output)
    assert.include(run.output, 'no changes')
  })

  test('a route that became public fails and shows up in the report', ({ assert }) => {
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

  test('a new route outside the baseline fails', ({ assert }) => {
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

  test('a missing baseline fails instead of passing silently', ({ assert }) => {
    const run = runScript('authz-check.ts', {
      AUTHZ_BASELINE: join(tmpdir(), 'does-not-exist.json'),
    })

    assert.equal(run.status, 1)
    assert.include(run.output, 'baseline missing')
  })
})

test.group('scripts > pattern-check (unit)', () => {
  test('the repository complies with the tree, the names and the ENV', ({ assert }) => {
    const run = runScript('pattern-check.ts')

    assert.equal(run.status, 0, run.output)
  })
})
