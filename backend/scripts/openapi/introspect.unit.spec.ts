import { join } from 'node:path'

import { test } from '@japa/runner'

import { introspect } from './introspect.ts'

/**
 * O gerador lê também o `_shared.<recurso>-refusal.ts` que o use-case importa
 * (`_standards/openapi.md`, "erros-do-use-case", `DECISIONS.md` #259): o
 * controller não declara o que o tradutor já diz.
 */
const FEATURES = join(import.meta.dirname, '../../app/features')

test.group('scripts > openapi > introspect (unit)', () => {
  test('lê do tradutor o código que o fato do use-case produz', async ({ assert }) => {
    const found = await introspect(
      join(FEATURES, 'administrator/sports/update/update.controller.ts'),
    )
    const codes = found?.errors.map((error) => error.code) ?? []

    assert.include(codes, 'SPORT_ROSTER_ABOVE_LIMIT')
    assert.include(codes, 'SPORT_INVALID_LIMITS')
  })

  test('segue a base `_shared` do use-case até o tradutor', async ({ assert }) => {
    const found = await introspect(join(FEATURES, 'advisor/photos/create/create.controller.ts'))
    const errors = found?.errors ?? []

    assert.isTrue(errors.some((error) => error.code === 'PHOTO_NOT_IMAGE' && error.status === 422))
    assert.isTrue(
      errors.some((error) => error.code === 'STORAGE_NOT_FOUND' && error.status === 422),
    )
  })

  test('traz a mensagem em pt-BR da chave do tradutor', async ({ assert }) => {
    const found = await introspect(
      join(FEATURES, 'administrator/sports/create/create.controller.ts'),
    )
    const conflict = found?.errors.find((error) => error.code === 'SPORT_ALREADY_EXISTS')

    assert.isString(conflict?.message)
    assert.notInclude(conflict?.message ?? '', 'sports.')
  })
})
