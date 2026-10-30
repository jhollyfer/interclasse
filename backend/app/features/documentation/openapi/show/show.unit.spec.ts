import { test } from '@japa/runner'

import DocumentationOpenapiShowUseCase from './show.use-case.ts'

import { makeWithMemory } from '#tests/container-fixtures'
import { rightOf } from '#tests/storages-unit-fixtures'

test.group('documentation/openapi > show (unit)', () => {
  test('devolve o documento commitado, como JSON de OpenAPI 3', async ({ assert }) => {
    const useCase = await makeWithMemory(DocumentationOpenapiShowUseCase, [])
    const specification = rightOf(await useCase.execute())

    assert.match(specification, /"openapi":\s*"3\./)
    assert.isObject(JSON.parse(specification))
  })

  test('a segunda leitura devolve o mesmo texto, sem reler o disco', async ({ assert }) => {
    const useCase = await makeWithMemory(DocumentationOpenapiShowUseCase, [])

    const first = rightOf(await useCase.execute())
    const second = rightOf(await useCase.execute())

    assert.strictEqual(second, first)
  })
})
