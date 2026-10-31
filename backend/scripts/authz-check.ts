/**
 * Fails on any change in the authorization chain of any route.
 *
 * What we want to catch here is the route that opened by accident: a `role()` that left
 * the group, an `auth()` forgotten on a new endpoint, an extra role in a list.
 * None of these changes breaks a test - the route keeps answering, only
 * to more people -, and none stands out in a big diff.
 *
 * The source is `openapi.json`, which already carries `security` and `x-roles` collected from the
 * middleware chain itself by `app/core/openapi/document.ts`. Reading from there, rather than
 * the router again, avoids a second implementation of the same reading -- which is
 * how the two come to disagree.
 *
 * The baseline is versioned. An intentional change goes in the same commit as the route,
 * with `--write`, and the baseline diff is what the reviewer reads: one line per route,
 * saying who can call it.
 *
 * Usage:
 *   node --import @poppinss/ts-exec scripts/authz-check.ts
 *   node --import @poppinss/ts-exec scripts/authz-check.ts --write
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const DOCUMENT = join(ROOT, 'openapi.json')
// `AUTHZ_BASELINE` swaps the file only so the script spec can prove the refusal without touching the real baseline.
const BASELINE = process.env.AUTHZ_BASELINE ?? join(ROOT, 'app/core/openapi/authz-baseline.json')

type Operation = {
  'security'?: Array<Record<string, string[]>>
  'x-roles'?: string[]
}

type OpenapiDocument = {
  paths: Record<string, Record<string, Operation>>
}

/** `anonymous`, `authenticated`, or the roles in order. */
function protectionOf(operation: Operation): string {
  const roles = operation['x-roles'] ?? []
  if (roles.length > 0) return [...roles].sort().join(', ')

  if (operation.security && operation.security.length > 0) return 'authenticated'

  return 'anonymous'
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
      removed.push(`  - ${route}  (was ${before})`)
      continue
    }

    if (before !== after) changed.push(`  ~ ${route}  ${before}  ->  ${after}`)
  }

  const total = added.length + removed.length + changed.length

  if (total === 0) {
    console.log(`authz:check: ${Object.keys(now).length} routes, no changes.`)
    return 0
  }

  console.log(`authz:check: ${total} changes in the authorization chain\n`)
  for (const line of [...added, ...removed, ...changed]) console.log(line)
  console.log('\n  Intentional? Run `pnpm authz:check -- --write` and commit the baseline with it.')

  return total
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2))
  const now = await current()

  if (flags.has('--write')) {
    await writeFile(BASELINE, `${JSON.stringify(now, null, 2)}\n`, 'utf8')
    console.log(`authz:check --write: ${Object.keys(now).length} routes written.`)
    return
  }

  const raw = await readFile(BASELINE, 'utf8').catch(() => '')

  if (raw === '') {
    console.error('authz:check: baseline missing. Run once with `--write` and commit it.')
    process.exitCode = 1
    return
  }

  const baseline: Record<string, string> = JSON.parse(raw)

  if (report(baseline, now) > 0) process.exitCode = 1
}

await main()
