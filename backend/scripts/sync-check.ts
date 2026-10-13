/**
 * Cobra a cópia local da régua contra o upstream (`jhollyfer/maiyu-pattern`).
 *
 * `_padroes/`, `_doc-lib/`, `SKILLS-MAP.md` e as skills da casa em `.claude/skills/`
 * não se editam aqui: vêm de `node <upstream>/scripts/sync-to-project.mjs <raiz>`.
 * Este script só delega ao `--check` do próprio upstream, para que a régua de
 * comparação seja uma só (_padroes/backend.md §10 e §11).
 *
 * Onde fica o upstream, nesta ordem:
 *   1. `MAIYU_PATTERN_DIR`, quando definido (o CI aponta para o checkout dele);
 *   2. `maiyu-pattern/` ao lado do repositório (`../../maiyu-pattern` a partir de `backend/`).
 *
 * Sem upstream à mão o script avisa e sai 0: o repositório é privado, e quem não
 * tem acesso a ele ainda precisa rodar `pnpm check`. O CI com o token configurado
 * cobra de verdade.
 *
 * Uso:
 *   node --import @poppinss/ts-exec scripts/sync-check.ts
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const BACKEND = resolve(dirname(new URL(import.meta.url).pathname), '..')
const RAIZ = resolve(BACKEND, '..')

const upstream = process.env.MAIYU_PATTERN_DIR ?? resolve(RAIZ, '..', 'maiyu-pattern')
const script = join(upstream, 'scripts', 'sync-to-project.mjs')

if (!existsSync(script)) {
  console.log(`sync:check (isolado): upstream não encontrado em ${upstream}; nada comparado.`)
  process.exit(0)
}

const resultado = spawnSync(process.execPath, [script, RAIZ, '--check'], { stdio: 'inherit' })
process.exitCode = resultado.status ?? 1
