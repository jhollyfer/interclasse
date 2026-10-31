import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { test } from '@japa/runner'

/**
 * The "qualified column" net (_standards/backend.md §4.7 and §7): in a query with
 * `join`, every column of `where`, `orderBy`, `groupBy`, `select` and aggregate carries
 * the table (`students.classroom_id`). A loose column is ambiguous as soon as the joined table
 * gains a column of the same name, and only fails at runtime.
 */
const DIRECTORY = import.meta.dirname
const JOIN = /\.(?:left|right|inner)?[jJ]oin(?:Raw)?\(/
const COLUMN_CALL =
  /\.(?:where|whereNot|whereIn|whereNotIn|whereNull|whereNotNull|whereILike|orWhere|orderBy|groupBy|select|count|countDistinct|sum|min|max)\(\s*'([^']+)'/g
/** An aggregate alias (`count('x as total')`) and an expression are not loose columns. */
const NOT_A_COLUMN = /\s|\*|\(/

type Finding = { readonly file: string; readonly column: string }

/** The Lucid repositories, one per folder. */
function lucidRepositories(): string[] {
  return readdirSync(DIRECTORY, { recursive: true, encoding: 'utf-8' }).filter((file) =>
    file.endsWith('.lucid.repository.ts'),
  )
}

/**
 * The chain of a query with join: from the `.from(` or `.query(` that opens it to the end
 * of the snippet (two blank lines separate the statements).
 */
function joinChains(source: string): string[] {
  return source
    .split(/\n\s*\n/)
    .filter((statement) => JOIN.test(statement))
    .map((statement) => {
      const joinAt = statement.search(JOIN)
      const start = Math.max(
        statement.lastIndexOf('.from(', joinAt),
        statement.lastIndexOf('.query(', joinAt),
      )

      return statement.slice(Math.max(start, 0))
    })
}

/** Aliases declared in the chain itself (`count('x as total')`): sorting by alias is unambiguous. */
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

test.group('repositories > qualified column (unit)', () => {
  test('a query with join only uses columns qualified by the table', ({ assert }) => {
    const findings = lucidRepositories().flatMap((file) => unqualifiedColumns(file))

    assert.deepEqual(findings, [])
  })

  test('the scan sees the repositories with join: without a target, the guard would not guard', ({
    assert,
  }) => {
    const withJoin = lucidRepositories().filter((file) =>
      JOIN.test(readFileSync(join(DIRECTORY, file), 'utf-8')),
    )

    assert.isAbove(withJoin.length, 0)
  })
})
