import { readFile } from 'node:fs/promises'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'

import openapi from '#config/openapi'

/**
 * The committed OpenAPI document.
 *
 * The generator **derives** the document from the controllers' AST, which is exactly
 * why it can silently lose an operation: renaming a validator export without
 * touching the controller does not break the build, `loadValidator` swallows the
 * import failure and the operation leaves the document without a single error.
 *
 * The guard against that is `node ace openapi:generate --check`. This file is the
 * second half of the guard: it checks that the repository's `openapi.json` describes
 * the real router, comparing with `router.toJSON()` instead of a hand-written
 * list - a new route falls into the comparison by construction.
 */

type Documento = {
  paths: Record<string, Record<string, { operationId: string; responses: Record<string, unknown> }>>
}

let document: Documento | undefined

async function readDocument(): Promise<Documento> {
  if (document) return document

  const read: Documento = JSON.parse(await readFile(app.makePath('openapi.json'), 'utf-8'))
  document = read
  return read
}

/**
 * `/administrator/notices/:id` -> `/administrator/notices/{id}`, which is the form
 * OpenAPI uses. The conversion is the same as `document.ts`; repeating it here is
 * what allows comparing the two sources without importing the generator.
 */
function toOpenApiPath(pattern: string): string {
  return pattern.replace(/:(\w+)/g, '{$1}')
}

/** Every registered operation: path and verb, without the `HEAD`s the framework generates. */
function registeredOperations(): Array<{ path: string; method: string }> {
  const operations: Array<{ path: string; method: string }> = []

  for (const route of Object.values(router.toJSON()).flat()) {
    const path = toOpenApiPath(route.pattern)

    if (openapi.ignore.includes(path) || openapi.ignore.includes(route.pattern)) continue

    for (const method of route.methods) {
      if (method === 'HEAD') continue

      operations.push({ path, method: method.toLowerCase() })
    }
  }

  return operations
}

test.group('documentation > the document describes the router', () => {
  test('every registered route is in the document', async ({ assert }) => {
    const { paths } = await readDocument()
    const missing = registeredOperations().filter(({ path, method }) => !paths[path]?.[method])

    // The message lists what is missing instead of just failing: whoever breaks this
    // by renaming a validator needs to know which operation vanished, and `--check`
    // alone only says the file diverged.
    assert.deepEqual(
      missing,
      [],
      `operações registered e absent do openapi.json: ${missing
        .map(({ method, path }) => `${method.toUpperCase()} ${path}`)
        .join(', ')}. Run \`node ace openapi:generate\`.`,
    )
  })

  test('the document does not describe a route that does not exist', async ({ assert }) => {
    const { paths } = await readDocument()
    const registered = new Set(
      registeredOperations().map(({ path, method }) => `${method} ${path}`),
    )

    const extra: string[] = []

    for (const [path, operations] of Object.entries(paths)) {
      for (const method of Object.keys(operations)) {
        if (!registered.has(`${method} ${path}`)) extra.push(`${method} ${path}`)
      }
    }

    assert.deepEqual(extra, [], `the document promises what the router does not serve: ${extra}`)
  })

  test('no operation is left without a described response', async ({ assert }) => {
    const { paths } = await readDocument()
    const silent: string[] = []

    for (const [path, operations] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        // Only success responses count: the failure ones the generator builds
        // on its own from the route protection, so their being there proves nothing
        // about the contract of whoever called and succeeded.
        const success = Object.keys(operation.responses).filter((status) => Number(status) < 400)

        if (success.length === 0) silent.push(`${method.toUpperCase()} ${path}`)
      }
    }

    assert.deepEqual(silent, [], `operations with no success response described: ${silent}`)
  })

  test('each operation identifier is unique', async ({ assert }) => {
    const { paths } = await readDocument()
    const seen = new Map<string, string>()
    const repeated: string[] = []

    for (const [path, operations] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        const previous = seen.get(operation.operationId)

        // `operationId` is what becomes a function name in a generated client. Two
        // equal ones do not break the document, they break the client - silently,
        // overwriting one of the two.
        if (previous) repeated.push(`${operation.operationId}: ${previous} e ${method} ${path}`)

        seen.set(operation.operationId, `${method} ${path}`)
      }
    }

    assert.deepEqual(repeated, [], `operationId repetido: ${repeated}`)
  })
})
