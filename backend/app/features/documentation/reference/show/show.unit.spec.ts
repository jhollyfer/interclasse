import { test } from '@japa/runner'

import DocumentationReferenceShowUseCase from './show.use-case.ts'

import openapi from '#config/openapi'
import { makeWithMemory } from '#tests/container-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

test.group('documentation/reference > show (unit)', () => {
  test('a página aponta para o /openapi.json e leva o título da API', async ({ assert }) => {
    const useCase = await makeWithMemory(DocumentationReferenceShowUseCase, [])
    const page = rightOf(await useCase.execute())

    assert.include(page, '/openapi.json')
    assert.include(page, openapi.info.title)
  })
})
