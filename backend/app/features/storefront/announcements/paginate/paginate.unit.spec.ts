import { test } from '@japa/runner'

import StorefrontAnnouncementPaginateUseCase from './paginate.use-case.ts'

import { Announcement } from '#domain/announcement/announcement.entity'
import { AnnouncementRepository } from '#repositories/announcement/announcement.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

test.group('storefront/announcements > paginate (unit)', () => {
  test('pinned first and then newest to oldest', async ({ assert }) => {
    const announcements = MemoryRepositories.announcements()
    const announcement = (id: string, title: string, day: number, pinned: boolean) =>
      announcements.save(
        Announcement.create({
          id,
          title,
          body: 'b',
          pinned,
          now: new Date(Date.UTC(2026, 9, day)),
        }),
      )
    await announcement('1d2c3b4a-5f6e-4d8c-9b0a-1f2e3d4c5b6a', 'Fixado antigo', 20, true)
    await announcement('2e3d4c5b-6a7f-4e9d-8c1b-2a3f4e5d6c7b', 'Antigo', 21, false)
    await announcement('3f4e5d6c-7b8a-4f0e-9d2c-3b4a5f6e7d8c', 'Novo', 28, false)
    const useCase = await makeWithMemory(StorefrontAnnouncementPaginateUseCase, [
      [AnnouncementRepository, announcements],
    ])

    const result = await useCase.execute({})

    assert.deepEqual(result.isRight() && result.value.data.map((item) => item.title), [
      'Fixado antigo',
      'Novo',
      'Antigo',
    ])
  })
})
