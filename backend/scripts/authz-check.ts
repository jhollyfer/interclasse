/**
 * Reprova mudanca na cadeia de autorizacao de qualquer rota.
 *
 * O que se quer pegar aqui e a rota que abriu sem querer: um `role()` que saiu
 * do grupo, um `auth()` esquecido num endpoint novo, um papel a mais numa lista.
 * Nenhuma dessas mudancas quebra teste - a rota continua respondendo, so que
 * para mais gente -, e nenhuma se destaca num diff grande.
 *
 * A fonte e o `openapi.json`, que ja carrega `security` e `x-roles` colhidos da
 * propria cadeia de middleware por `app/core/openapi/document.ts`. Ler dali, e
 * nao o router de novo, evita uma segunda implementacao da mesma leitura -- que
 * e como as duas passam a discordar.
 *
 * O baseline e versionado. Mudanca intencional entra no mesmo commit da rota,
 * com `--write`, e o diff do baseline e o que o revisor le: uma linha por rota,
 * dizendo quem pode chamar.
 *
 * Uso:
 *   node --import @poppinss/ts-exec scripts/authz-check.ts
 *   node --import @poppinss/ts-exec scripts/authz-check.ts --write
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const DOCUMENT = join(ROOT, 'openapi.json')
const BASELINE = join(ROOT, 'app/core/openapi/authz-baseline.json')

type Operation = {
  'security'?: Array<Record<string, string[]>>
  'x-roles'?: string[]
}

type OpenapiDocument = {
  paths: Record<string, Record<string, Operation>>
}

/** `anonima`, `autenticada`, ou os papeis em ordem. */
function protectionOf(operation: Operation): string {
  const roles = operation['x-roles'] ?? []
  if (roles.length > 0) return [...roles].sort().join(', ')

  if (operation.security && operation.security.length > 0) return 'autenticada'

  return 'anonima'
}

async function current(): Promise<Record<string, string>> {
  const document: OpenapiDocument = JSON.parse(await readFile(DOCUMENT, 'utf8'))
  const map: Record<string, string> = {}

  for (const [routePath, methods] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      map[`${method.toUpperCase()} ${routePath}`] = protectionOf(operation)
    }
  }

  return map
}

function report(baseline: Record<string, string>, now: Record<string, string>): number {
  const routes = new Set([...Object.keys(baseline), ...Object.keys(now)])
  const added: string[] = []
  const removed: string[] = []
  const changed: string[] = []

  for (const route of [...routes].sort()) {
    const before = baseline[route]
    const after = now[route]

    if (before === undefined) {
      added.push(`  + ${route}  ->  ${after}`)
      continue
    }

    if (after === undefined) {
      removed.push(`  - ${route}  (era ${before})`)
      continue
    }

    if (before !== after) changed.push(`  ~ ${route}  ${before}  ->  ${after}`)
  }

  const total = added.length + removed.length + changed.length

  if (total === 0) {
    console.log(`authz:check: ${Object.keys(now).length} rotas, nenhuma mudanca.`)
    return 0
  }

  console.log(`authz:check: ${total} mudancas na cadeia de autorizacao\n`)
  for (const line of [...added, ...removed, ...changed]) console.log(line)
  console.log('\n  Intencional? `pnpm authz:check -- --write` e commite o baseline junto.')

  return total
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2))
  const now = await current()

  if (flags.has('--write')) {
    await writeFile(BASELINE, `${JSON.stringify(now, null, 2)}\n`, 'utf8')
    console.log(`authz:check --write: ${Object.keys(now).length} rotas gravadas.`)
    return
  }

  const raw = await readFile(BASELINE, 'utf8').catch(() => '')

  if (raw === '') {
    console.error('authz:check: baseline ausente. Rode com `--write` uma vez e commite.')
    process.exitCode = 1
    return
  }

  const baseline: Record<string, string> = JSON.parse(raw)

  if (report(baseline, now) > 0) process.exitCode = 1
}

await main()
