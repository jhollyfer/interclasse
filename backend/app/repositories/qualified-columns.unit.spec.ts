import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { test } from '@japa/runner'

/**
 * A rede "coluna qualificada" (_standards/backend.md §4.7 e §7): em consulta com
 * `join`, toda coluna de `where`, `orderBy`, `groupBy`, `select` e agregado leva
 * a tabela (`students.classroom_id`). Coluna solta é ambígua assim que a tabela
 * do join ganha uma coluna de mesmo nome, e só falha em runtime.
 */
const DIRECTORY = import.meta.dirname
const JOIN = /\.(?:left|right|inner)?[jJ]oin(?:Raw)?\(/
const COLUMN_CALL =
  /\.(?:where|whereNot|whereIn|whereNotIn|whereNull|whereNotNull|whereILike|orWhere|orderBy|groupBy|select|count|countDistinct|sum|min|max)\(\s*'([^']+)'/g
/** Alias de agregado (`count('x as total')`) e expressão não são coluna solta. */
const NOT_A_COLUMN = /\s|\*|\(/

type Finding = { readonly file: string; readonly column: string }

/** Os repositórios Lucid, um por pasta. */
function lucidRepositories(): string[] {
  return readdirSync(DIRECTORY, { recursive: true, encoding: 'utf-8' }).filter((file) =>
    file.endsWith('.lucid.repository.ts'),
  )
}

/**
 * A cadeia de uma consulta com join: do `.from(` ou `.query(` que a abre até o fim
 * do trecho (duas linhas em branco separam os statements).
 */
function joinChains(source: string): string[] {
  return source
    .split(/\n\s*\n/)
    .filter((statement) => JOIN.test(statement))
    .map((statement) => {
      const join = statement.search(JOIN)
      const start = Math.max(
        statement.lastIndexOf('.from(', join),
        statement.lastIndexOf('.query(', join),
      )

      return statement.slice(Math.max(start, 0))
    })
}

/** Aliases declarados na própria cadeia (`count('x as total')`): ordenar por alias é inequívoco. */
function aliasesOf(chain: string): ReadonlySet<string> {
  return new Set([...chain.matchAll(/\bas\s+(\w+)'/g)].map((match) => match[1] ?? ''))
}

function unqualifiedColumns(file: string): Finding[] {
  const source = readFileSync(join(DIRECTORY, file), 'utf-8')

  return joinChains(source).flatMap((chain) => {
    const aliases = aliasesOf(chain)

    return [...chain.matchAll(COLUMN_CALL)]
      .map((match) => match[1] ?? '')
      .filter(
        (column) => !column.includes('.') && !NOT_A_COLUMN.test(column) && !aliases.has(column),
      )
      .map((column) => ({ file, column }))
  })
}

test.group('repositories > coluna qualificada (unit)', () => {
  test('consulta com join só usa coluna qualificada pela tabela', ({ assert }) => {
    const findings = lucidRepositories().flatMap((file) => unqualifiedColumns(file))

    assert.deepEqual(findings, [])
  })

  test('a varredura enxerga repositórios com join: sem alvo, o guard não guardaria', ({
    assert,
  }) => {
    const withJoin = lucidRepositories().filter((file) =>
      JOIN.test(readFileSync(join(DIRECTORY, file), 'utf-8')),
    )

    assert.isAbove(withJoin.length, 0)
  })
})
