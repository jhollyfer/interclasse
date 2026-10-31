import { test } from '@japa/runner'

import AdministratorSiteShowUseCase from './show.use-case.ts'

import { SiteSettingRepository } from '#repositories/site-setting/site-setting.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

test.group('administrator/site > show (unit)', () => {
  test('on the first read returns the empty configuration, without a regulation', async ({
    assert,
  }) => {
    const useCase = await makeWithMemory(AdministratorSiteShowUseCase, [
      [SiteSettingRepository, MemoryRepositories.siteSettings()],
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
