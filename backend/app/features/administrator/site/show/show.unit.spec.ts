import { test } from '@japa/runner'

import AdministratorSiteShowUseCase from './show.use-case.ts'

import { SiteSettingRepository } from '#repositories/site-setting/site-setting.repository'
import { SiteSettingMemoryRepository } from '#repositories/site-setting/site-setting.memory.repository'
import { makeWithMemory } from '#tests/container-fixtures'

test.group('administrator/site > show (unit)', () => {
  test('na primeira leitura devolve a configuração vazia, sem regulamento', async ({ assert }) => {
    const useCase = await makeWithMemory(AdministratorSiteShowUseCase, [
      [SiteSettingRepository, new SiteSettingMemoryRepository()],
    ])

    const result = await useCase.execute()

    assert.isTrue(result.isRight())
    assert.deepInclude(result.value, {
      about: null,
      organizer: null,
      edition: null,
      regulationId: null,
      regulation: null,
    })
  })
})
