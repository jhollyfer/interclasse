import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

import { introspect } from './introspect.ts'

/**
 * The generator also reads the `_shared.<resource>-refusal.ts` that the use case imports
 * (`_standards/openapi.md`, "erros-do-use-case", `DECISIONS.md` #259): the
 * controller does not declare what the translator already says.
 */
const FEATURES = join(import.meta.dirname, '../../app/features')

test.group('scripts > openapi > introspect (unit)', () => {
  test('reads from the translator the code the use-case fact produces', async ({
    assert,
  }) => {
    const found = await introspect(
      join(FEATURES, 'administrator/sports/update/update.controller.ts'),
    )
    const codes = found?.errors.map((error) => error.code) ?? []

    assert.include(codes, 'SPORT_ROSTER_ABOVE_LIMIT')
    assert.include(codes, 'SPORT_INVALID_LIMITS')
  })

  test('follows the use case `_shared` base to the translator', async ({
    assert,
  }) => {
    const found = await introspect(
      join(FEATURES, 'advisor/photos/create/create.controller.ts'),
    )
    const errors = found?.errors ?? []

    assert.isTrue(
      errors.some(
        (error) => error.code === 'PHOTO_NOT_IMAGE' && error.status === 422,
      ),
    )
    assert.isTrue(
      errors.some(
        (error) => error.code === 'STORAGE_NOT_FOUND' && error.status === 422,
      ),
    )
  })

  test('brings the pt-BR message of the translator key', async ({ assert }) => {
    const found = await introspect(
      join(FEATURES, 'administrator/sports/create/create.controller.ts'),
    )
    const conflict = found?.errors.find(
      (error) => error.code === 'SPORT_ALREADY_EXISTS',
    )

    assert.isString(conflict?.message)
    assert.notInclude(conflict?.message ?? '', 'sports.')
  })

  test('the committed openapi.json describes the 429 of every route behind a limiter', async ({
    assert,
  }) => {
    const document = JSON.parse(
      await readFile(join(import.meta.dirname, '../../openapi.json'), 'utf8'),
    )
    const throttled = [
      ['/authentication/sign-in', 'post'],
      ['/authentication/refresh', 'post'],
      ['/account', 'put'],
      ['/storages', 'post'],
      ['/administrator/reports/csv', 'get'],
    ] as const

    for (const [path, method] of throttled) {
      assert.property(
        document.paths[path][method].responses,
        '429',
        `${method.toUpperCase()} ${path} is behind a limiter and does not document the 429`,
      )
    }
  })
})
