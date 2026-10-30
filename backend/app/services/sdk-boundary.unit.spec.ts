import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { test } from '@japa/runner'

/**
 * A rede "SDK só no adaptador" (_standards/backend.md §7): import de SDK de
 * fornecedor só existe em `services/<nome>/<nome>.service.ts`. O resto do código
 * fala com o contrato (`<nome>.contract.ts`), e o provider liga a implementação.
 */
const BACKEND = join(import.meta.dirname, '..', '..')
const ROOTS = ['app', 'commands']
const VENDORS = ['@aws-sdk/', '@smithy/', '@adonisjs/drive', '@adonisjs/mail', 'nodemailer']
const SERVICE = /^app\/services\/([^/]+)\/\1\.service\.ts$/
const SPEC = /\.(unit|e2e)\.spec\.ts$/
const IMPORT = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g

/** Os arquivos de produção sob `app/` e `commands/`, com caminho relativo ao backend. */
function productionFiles(): string[] {
  return ROOTS.flatMap((root) =>
    readdirSync(join(BACKEND, root), { recursive: true, encoding: 'utf-8' })
      .map((file) => relative(BACKEND, join(BACKEND, root, file)))
      .filter((file) => file.endsWith('.ts') && !SPEC.test(file)),
  )
}

/** Os especificadores importados por um arquivo. */
function importsOf(file: string): string[] {
  const source = readFileSync(join(BACKEND, file), 'utf-8')

  return [...source.matchAll(IMPORT)].map((match) => match[1] ?? '')
}

test.group('services > fronteira do SDK (unit)', () => {
  test('SDK de fornecedor só é importado pelo adaptador do service', ({ assert }) => {
    const offenders = productionFiles()
      .filter((file) => !SERVICE.test(file))
      .filter((file) =>
        importsOf(file).some((specifier) => VENDORS.some((vendor) => specifier.startsWith(vendor))),
      )

    assert.deepEqual(offenders, [])
  })

  test('a varredura enxerga o adaptador: sem alvo, o guard não guardaria', ({ assert }) => {
    const adapters = productionFiles().filter((file) => SERVICE.test(file))

    assert.isAbove(adapters.length, 0)
    assert.isTrue(
      adapters.some((file) =>
        importsOf(file).some((specifier) => VENDORS.some((vendor) => specifier.startsWith(vendor))),
      ),
    )
  })
})
