/**
 * Checks the local copy of the ruler against the upstream (`jhollyfer/maiyu-pattern`).
 *
 * `_standards/`, `_doc-lib/`, `SKILLS-MAP.md` and the house skills in `.claude/skills/`
 * are not edited here: they come from `node <upstream>/scripts/sync-to-project.mjs <root>`.
 * This script only delegates to the upstream's own `--check`, so that the comparison
 * ruler is a single one (_standards/backend.md §10 and §11).
 *
 * Where the upstream is, in this order:
 *   1. `MAIYU_PATTERN_DIR`, when defined;
 *   2. `maiyu-pattern/` next to the repository (`../../maiyu-pattern` from `backend/`).
 *
 * Local check, outside CI. Without an upstream at hand the script warns and exits 0: the
 * repository is private, and whoever has no access to it still needs to run `pnpm check`.
 *
 * Usage:
 *   node --import @poppinss/ts-exec scripts/sync-check.ts
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const BACKEND = resolve(dirname(new URL(import.meta.url).pathname), '..')
const ROOT = resolve(BACKEND, '..')

const upstream = process.env.MAIYU_PATTERN_DIR ?? resolve(ROOT, '..', 'maiyu-pattern')
const script = join(upstream, 'scripts', 'sync-to-project.mjs')

if (!existsSync(script)) {
  console.log(`sync:check (isolated): upstream not found at ${upstream}; nothing compared.`)
  process.exit(0)
}

const result = spawnSync(process.execPath, [script, ROOT, '--check'], { stdio: 'inherit' })
process.exitCode = result.status ?? 1
