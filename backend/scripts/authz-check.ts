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

const RAIZ = resolve(dirname(new URL(import.meta.url).pathname), '..')
const DOCUMENTO = join(RAIZ, 'openapi.json')
const BASELINE = join(RAIZ, 'app/core/openapi/authz-baseline.json')

type Operacao = {
  'security'?: Array<Record<string, string[]>>
  'x-roles'?: string[]
}

type Documento = {
  paths: Record<string, Record<string, Operacao>>
}

/** `anonima`, `autenticada`, ou os papeis em ordem. */
function protecaoDe(operacao: Operacao): string {
  const papeis = operacao['x-roles'] ?? []
  if (papeis.length > 0) return [...papeis].sort().join(', ')

  if (operacao.security && operacao.security.length > 0) return 'autenticada'

  return 'anonima'
}

async function atual(): Promise<Record<string, string>> {
  const documento: Documento = JSON.parse(await readFile(DOCUMENTO, 'utf8'))
  const mapa: Record<string, string> = {}

  for (const [caminho, metodos] of Object.entries(documento.paths)) {
    for (const [metodo, operacao] of Object.entries(metodos)) {
      mapa[`${metodo.toUpperCase()} ${caminho}`] = protecaoDe(operacao)
    }
  }

  return mapa
}

function relatar(baseline: Record<string, string>, agora: Record<string, string>): number {
  const rotas = new Set([...Object.keys(baseline), ...Object.keys(agora)])
  const novas: string[] = []
  const sumidas: string[] = []
  const mudadas: string[] = []

  for (const rota of [...rotas].sort()) {
    const antes = baseline[rota]
    const depois = agora[rota]

    if (antes === undefined) {
      novas.push(`  + ${rota}  ->  ${depois}`)
      continue
    }

    if (depois === undefined) {
      sumidas.push(`  - ${rota}  (era ${antes})`)
      continue
    }

    if (antes !== depois) mudadas.push(`  ~ ${rota}  ${antes}  ->  ${depois}`)
  }

  const total = novas.length + sumidas.length + mudadas.length

  if (total === 0) {
    console.log(`authz:check: ${Object.keys(agora).length} rotas, nenhuma mudanca.`)
    return 0
  }

  console.log(`authz:check: ${total} mudancas na cadeia de autorizacao\n`)
  for (const linha of [...novas, ...sumidas, ...mudadas]) console.log(linha)
  console.log('\n  Intencional? `pnpm authz:check -- --write` e commite o baseline junto.')

  return total
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2))
  const agora = await atual()

  if (flags.has('--write')) {
    await writeFile(BASELINE, `${JSON.stringify(agora, null, 2)}\n`, 'utf8')
    console.log(`authz:check --write: ${Object.keys(agora).length} rotas gravadas.`)
    return
  }

  const bruto = await readFile(BASELINE, 'utf8').catch(() => '')

  if (bruto === '') {
    console.error('authz:check: baseline ausente. Rode com `--write` uma vez e commite.')
    process.exitCode = 1
    return
  }

  const baseline: Record<string, string> = JSON.parse(bruto)

  if (relatar(baseline, agora) > 0) process.exitCode = 1
}

await main()
