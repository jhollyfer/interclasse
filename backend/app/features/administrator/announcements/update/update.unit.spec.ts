import { test } from '@japa/runner'

import AdministratorAnnouncementUpdateUseCase from './update.use-case.ts'

import { Announcement } from '#domain/announcement/announcement.entity'
import { AnnouncementRepository } from '#repositories/announcement/announcement.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

const ID = '6a4f2e1d-0c9b-4a8f-8e7d-6c5b4a3f2e1d'

async function setup() {
  const announcements = MemoryRepositories.announcements()
  await announcements.save(
    Announcement.create({ id: ID, title: 'Adiado', body: 'Às 15h', now: new Date() }),
  )
  const useCase = await makeWithMemory(AdministratorAnnouncementUpdateUseCase, [
    [AnnouncementRepository, announcements],
  ])

  return { announcements, useCase }
}

test.group('administrator/announcements > update (unit)', () => {
  test('muda só o que veio no payload', async ({ assert }) => {
    const { announcements, useCase } = await setup()

    const result = await useCase.execute({ id: ID, pinned: true })

    assert.deepInclude(result.value, { title: 'Adiado', body: 'Às 15h', pinned: true })
    const stored = await announcements.findById(ID)
    assert.isTrue(stored?.snapshot().pinned)
  })

  test('inexistente é 404 ANNOUNCEMENT_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000', title: 'X' })

    assert.deepInclude(result.value, { status: 404, code: 'ANNOUNCEMENT_NOT_FOUND' })
  })
})
