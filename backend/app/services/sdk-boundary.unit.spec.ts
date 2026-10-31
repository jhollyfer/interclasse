import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { test } from '@japa/runner'

/**
 * The "SDK only in the adapter" net (_standards/backend.md §7): a vendor SDK import
 * only exists in `services/<name>/<name>.service.ts`. The rest of the code
 * talks to the contract (`<name>.contract.ts`), and the provider binds the implementation.
 */
const BACKEND = join(import.meta.dirname, '..', '..')
const ROOTS = ['app', 'commands']
const VENDORS = ['@aws-sdk/', '@smithy/', '@adonisjs/drive', '@adonisjs/mail', 'nodemailer']
const SERVICE = /^app\/services\/([^/]+)\/\1\.service\.ts$/
const SPEC = /\.(unit|e2e)\.spec\.ts$/
const IMPORT = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g

/** The production files under `app/` and `commands/`, with a path relative to the backend. */
function productionFiles(): string[] {
  return ROOTS.flatMap((root) =>
    readdirSync(join(BACKEND, root), { recursive: true, encoding: 'utf-8' })
      .map((file) => relative(BACKEND, join(BACKEND, root, file)))
      .filter((file) => file.endsWith('.ts') && !SPEC.test(file)),
  )
}

/** The specifiers imported by a file. */
function importsOf(file: string): string[] {
  const source = readFileSync(join(BACKEND, file), 'utf-8')

  return [...source.matchAll(IMPORT)].map((match) => match[1] ?? '')
}

test.group('services > SDK boundary (unit)', () => {
  test('a vendor SDK is only imported by the service adapter', ({ assert }) => {
    const offenders = productionFiles()
      .filter((file) => !SERVICE.test(file))
      .filter((file) =>
        importsOf(file).some((specifier) => VENDORS.some((vendor) => specifier.startsWith(vendor))),
      )

    assert.deepEqual(offenders, [])
  })

  test('the scan sees the adapter: without a target, the guard would not guard', ({ assert }) => {
    const adapters = productionFiles().filter((file) => SERVICE.test(file))

    assert.isAbove(adapters.length, 0)
    assert.isTrue(
      adapters.some((file) =>
        importsOf(file).some((specifier) => VENDORS.some((vendor) => specifier.startsWith(vendor))),
      ),
    )
  })
})
