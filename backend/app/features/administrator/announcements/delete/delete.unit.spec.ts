import { test } from '@japa/runner'

import AdministratorAnnouncementDeleteUseCase from './delete.use-case.ts'

import { Announcement } from '#domain/announcement/announcement.entity'
import { AnnouncementRepository } from '#repositories/announcement/announcement.repository'
import { AnnouncementMemoryRepository } from '#repositories/announcement/announcement.memory.repository'
import { makeWithMemory } from '#tests/container-fixtures'

const ID = '9b8a7f6e-5d4c-4b3a-8f2e-1d0c9b8a7f6e'

async function setup() {
  const announcements = new AnnouncementMemoryRepository()
  await announcements.save(
    Announcement.create({ id: ID, title: 'Vencido', body: 'Já passou', now: new Date() }),
  )
  const useCase = await makeWithMemory(AdministratorAnnouncementDeleteUseCase, [
    [AnnouncementRepository, announcements],
  ])

  return { announcements, useCase }
}

test.group('administrator/announcements > delete (unit)', () => {
  test('apaga o aviso', async ({ assert }) => {
    const { announcements, useCase } = await setup()

    const result = await useCase.execute({ id: ID })

    assert.isTrue(result.isRight())
    assert.isNull(await announcements.findById(ID))
  })

  test('inexistente é 404 ANNOUNCEMENT_NOT_FOUND', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ id: '00000000-0000-4000-8000-000000000000' })

    assert.deepInclude(result.value, { status: 404, code: 'ANNOUNCEMENT_NOT_FOUND' })
  })
})
