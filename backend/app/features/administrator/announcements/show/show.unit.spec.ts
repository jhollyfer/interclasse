import { test } from '@japa/runner'

import AdministratorAnnouncementShowUseCase from './show.use-case.ts'

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
  const useCase = await makeWithMemory(AdministratorAnnouncementShowUseCase, [
    [AnnouncementRepository, announcements],
  ])

  return { useCase }
}

test.group('administrator/announcements > show (unit)', () => {
  test('devolve o aviso', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: ID })

    assert.isTrue(result.isRight())
    assert.deepInclude(result.value, { id: ID, title: 'Adiado', pinned: false })
  })

  test('inexistente é 404 ANNOUNCEMENT_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000' })

    assert.deepInclude(result.value, { status: 404, code: 'ANNOUNCEMENT_NOT_FOUND' })
  })
})
