import { test } from '@japa/runner'

import AdministratorAnnouncementCreateUseCase from './create.use-case.ts'

import { AnnouncementRepository } from '#repositories/announcement/announcement.repository'
import { MemoryRepositories } from '#tests/memory-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const announcements = MemoryRepositories.announcements()
  const useCase = await makeWithMemory(AdministratorAnnouncementCreateUseCase, [
    [AnnouncementRepository, announcements],
  ])

  return { announcements, useCase }
}

test.group('administrator/announcements > create (unit)', () => {
  test('publica sem destaque quando não pedem', async ({ assert }) => {
    const { announcements, useCase } = await setup()

    const result = await useCase.execute({ title: 'Jogo adiado', body: 'Às 15h' })

    assert.isTrue(result.isRight())
    assert.deepInclude(result.value, { title: 'Jogo adiado', body: 'Às 15h', pinned: false })
    assert.isNotNull(await announcements.findById(String(result.isRight() && result.value.id)))
  })

  test('publica fixado quando pedem', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ title: 'Regulamento', body: 'Leia', pinned: true })

    assert.deepInclude(result.value, { pinned: true })
  })
})
