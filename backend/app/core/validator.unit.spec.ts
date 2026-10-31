import { glob } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'

import * as core from '#core/validator'
import { FIELD_LABELS as LABELS_BY_LOCALE } from '#core/validator'

/** pt-BR is the reference: the compiler already enforces the same keys in es and en. */
const FIELD_LABELS = LABELS_BY_LOCALE['pt-BR']

/**
 * The static audits of the validators, all through `toJSONSchema()`.
 *
 * The field list comes from the validators themselves, not from a second list
 * to keep up to date - a new field out of line is born red.
 *
 * Next to `validator.ts` because it is a cross-cutting spec: it covers every validator of the
 * project, not one action (_standards/backend.md §7).
 */

type Introspectable = { toJSONSchema: () => unknown }

function isValidator<T>(value: T): value is T & Introspectable {
  if (typeof value !== 'object' || value === null) return false
  if (!('toJSONSchema' in value)) return false

  return typeof value.toJSONSchema === 'function'
}

/** The child of `node` at `key`, always as a list, so the recursion does not branch. */
function branch(node: unknown, key: string): Array<unknown> {
  if (typeof node !== 'object' || node === null) return []

  // `Reflect.get` and not an index: `key in node` narrows `node`, but does not make
  // it valid to index it by any `string` - and the assertion that solved
  // that is rule 3 of `code-pattern`. A missing key returns `undefined`,
  // which here means the same as an empty branch.
  const value = Reflect.get(node, key)

  if (value === undefined) return []

  if (Array.isArray(value)) return value

  return [value]
}

/**
 * Every validator of the project: the globals of `#core/validator` and the
 * `<resource>.validator.ts` of each resource in `app/validators` (_standards/backend.md
 * §4.4). The glob
 * is what lets us split the validator per resource without losing the net.
 */
const modules: Array<Record<string, unknown>> = [core]
for await (const file of glob('app/validators/**/*.validator.ts', {
  cwd: app.appRoot.pathname,
})) {
  modules.push(await import(pathToFileURL(app.makePath(file)).href))
}

const validators = modules.flatMap((mod) => Object.values(mod)).filter(isValidator)

test.group('validator > sweep', () => {
  // Without this guard, a glob that matches nothing would leave the audits below
  // green looking only at the global validators.
  test('finds the validator of each resource', ({ assert }) => {
    assert.isAbove(modules.length, 10)
  })
})

/** Every path whose node is `type: 'string'`, with the node along. */
function strings(schema: unknown, prefix = ''): Array<[string, unknown]> {
  const found: Array<[string, unknown]> = []

  for (const each of branch(schema, 'anyOf')) found.push(...strings(each, prefix))
  for (const each of branch(schema, 'items')) found.push(...strings(each, `${prefix}[]`))

  for (const properties of branch(schema, 'properties')) {
    if (typeof properties !== 'object' || properties === null) continue

    for (const [name, child] of Object.entries(properties)) {
      const path = [prefix, name].filter(Boolean).join('.')

      if (branch(child, 'type').includes('string')) found.push([path, child])

      found.push(...strings(child, path))
    }
  }

  return found
}

/**
 * The size ceiling of every text field.
 *
 * Text columns are `varchar(255)` - which is what Knex's `table.string()`
 * creates - when the migration does not say another size. A field with no ceiling in the validator
 * lets a large value cross validation and blow up in Postgres: what
 * should be a 422 pointing at the field becomes a 500 with "internal error" on screen, and the
 * server log is the only place showing what happened.
 */
test.group('validator > text ceilings', () => {
  test('every text field has a size limit', ({ assert }) => {
    // `format` and `pattern` cover whoever already limits by another path - `email()`,
    // `uuid()` -, and `enum` is not free text.
    const withoutCeiling = validators
      .flatMap((each) => strings(each.toJSONSchema()))
      .filter(([, node]) => {
        if (typeof node !== 'object' || node === null) return false

        return !['maxLength', 'format', 'pattern', 'enum'].some((key) => key in node)
      })
      .map(([path]) => path)

    assert.deepEqual([...new Set(withoutCeiling)].sort(), [])
  })
})

/** Every field path of the schema, including nested ones (`parts.etag`). */
function walk(schema: unknown, prefix = ''): Array<string> {
  const paths: Array<string> = []

  // `anyOf` is what an object's `.optional()` produces: the object and null.
  for (const each of branch(schema, 'anyOf')) paths.push(...walk(each, prefix))
  for (const each of branch(schema, 'items')) paths.push(...walk(each, prefix))

  for (const properties of branch(schema, 'properties')) {
    if (typeof properties !== 'object' || properties === null) continue

    for (const [name, child] of Object.entries(properties)) {
      const path = [prefix, name].filter(Boolean).join('.')

      paths.push(path)
      paths.push(...walk(child, path))
    }
  }

  return paths
}

const fields = new Set(validators.flatMap((each) => walk(each.toJSONSchema())))

/**
 * Legitimate label that will never appear in `toJSONSchema()`.
 *
 * `passwordConfirmation` is not a declared field: it is born from
 * `.confirmed({ as: 'passwordConfirmation' })` in `password()`, which is a
 * rule. The error is reported under that name, so the label must exist - but the
 * schema does not know the key, and without this list the orphan test would flag it.
 */
const SEM_CAMPO_NO_SCHEMA = ['passwordConfirmation']

/**
 * The friendly name of every field, in both directions.
 *
 * A field without a label breaks nothing - it only makes the response ask "Informe avatarId"
 * instead of "Informe o avatar". Because it breaks nothing, it goes unnoticed, and that is
 * exactly why the enforcement needs to be automatic.
 */
test.group('validator > labels', () => {
  test('every validator field has a name in the three languages', ({ assert }) => {
    // The raw name serves as the VineJS fallback, so it is enough for the last segment to have
    // a label - `parts.etag` falls to `etag` if the full path is not
    // listed. Both count, and the full path wins when it exists.
    const withoutLabel = [...fields].filter((path) => {
      if (path in FIELD_LABELS) return false

      const leaf = path.slice(path.lastIndexOf('.') + 1)

      return !(leaf in FIELD_LABELS)
    })

    assert.deepEqual(withoutLabel.sort(), [])
  })

  test('no label is left for a field that no longer exists', ({ assert }) => {
    // The opposite of the test above: a label for a field that already left the validator does not
    // warn that it is dead, and keeps being copied to the next resource.
    const leaves = new Set([...fields].map((path) => path.slice(path.lastIndexOf('.') + 1)))

    const orphans = Object.keys(FIELD_LABELS).filter((key) => {
      if (SEM_CAMPO_NO_SCHEMA.includes(key)) return false

      return !fields.has(key) && !leaves.has(key)
    })

    assert.deepEqual(orphans.sort(), [])
  })
})
