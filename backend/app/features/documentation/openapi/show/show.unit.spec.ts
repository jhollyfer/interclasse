import { test } from '@japa/runner'

import DocumentationOpenapiShowUseCase from './show.use-case.ts'

import { makeWithMemory } from '#tests/container-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

test.group('documentation/openapi > show (unit)', () => {
  test('returns the committed document, as OpenAPI 3 JSON', async ({ assert }) => {
    const useCase = await makeWithMemory(DocumentationOpenapiShowUseCase, [])
    const specification = rightOf(await useCase.execute())

    assert.match(specification, /"openapi":\s*"3\./)
    assert.isObject(JSON.parse(specification))
  })

  test('the second read returns the same text, without rereading the disk', async ({ assert }) => {
    const useCase = await makeWithMemory(DocumentationOpenapiShowUseCase, [])

    const first = rightOf(await useCase.execute())
    const second = rightOf(await useCase.execute())

    assert.strictEqual(second, first)
  })
})
