import { test } from '@japa/runner'

import AdministratorAnnouncementPaginateUseCase from './paginate.use-case.ts'

import { Announcement } from '#domain/announcement/announcement.entity'
import { AnnouncementRepository } from '#repositories/announcement/announcement.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const announcements = MemoryRepositories.announcements()
  await announcements.save(
    Announcement.create({
      id: '1d2c3b4a-5f6e-4d8c-9b0a-1f2e3d4c5b6a',
      title: 'Fixado antigo',
      body: 'b',
      pinned: true,
      now: new Date('2026-10-26T12:00:00Z'),
    }),
  )
  await announcements.save(
    Announcement.create({
      id: '2e3d4c5b-6a7f-4e9d-8c1b-2a3f4e5d6c7b',
      title: 'Recente',
      body: 'b',
      now: new Date('2026-10-29T12:00:00Z'),
    }),
  )
  const useCase = await makeWithMemory(AdministratorAnnouncementPaginateUseCase, [
    [AnnouncementRepository, announcements],
  ])

  return { useCase }
}

test.group('administrator/announcements > paginate (unit)', () => {
  test('without a requested order, pinned first', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({})

    assert.deepEqual(result.isRight() && result.value.data.map((item) => item.title), [
      'Fixado antigo',
      'Recente',
    ])
  })

  test('with a requested order, the pinned one does not go in front', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ sort: 'title', direction: 'desc' })

    assert.deepEqual(result.isRight() && result.value.data.map((item) => item.title), [
      'Recente',
      'Fixado antigo',
    ])
  })

  test('search by title', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ sort: 'createdAt', direction: 'desc', search: 'rec' })

    assert.deepEqual(result.isRight() && result.value.data.map((item) => item.title), ['Recente'])
  })
})
