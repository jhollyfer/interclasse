import { test } from '@japa/runner'

import { Announcement } from './announcement.entity.ts'

const NOW = new Date('2026-10-29T12:00:00Z')
const LATER = new Date('2026-10-30T12:00:00Z')

function buildAnnouncement(): Announcement {
  return Announcement.restore({
    id: 'aviso',
    title: 'Jogo adiado',
    body: 'A partida foi para as 15h.',
    pinned: false,
    createdAt: NOW,
    updatedAt: null,
  })
}

test.group('Announcement', () => {
  test('is born unpinned when not asked', ({ assert }) => {
    const announcement = Announcement.create({ id: 'id', title: 'T', body: 'B', now: NOW })

    assert.deepEqual(announcement.snapshot(), {
      id: 'id',
      title: 'T',
      body: 'B',
      pinned: false,
      createdAt: NOW,
      updatedAt: NOW,
    })
  })

  test('is born pinned when requested', ({ assert }) => {
    const announcement = Announcement.create({
      id: 'id',
      title: 'T',
      body: 'B',
      pinned: true,
      now: NOW,
    })

    assert.isTrue(announcement.snapshot().pinned)
  })

  test('editing changes only what came and stamps the edit', ({ assert }) => {
    const announcement = buildAnnouncement()

    announcement.edit({ pinned: true }, LATER)

    assert.deepInclude(announcement.snapshot(), {
      title: 'Jogo adiado',
      body: 'A partida foi para as 15h.',
      pinned: true,
      updatedAt: LATER,
    })
  })

  test('editing title and text changes both and keeps the pin', ({ assert }) => {
    const announcement = buildAnnouncement()

    announcement.edit({ title: 'Novo', body: 'Outro texto' }, LATER)

    assert.deepInclude(announcement.snapshot(), {
      title: 'Novo',
      body: 'Outro texto',
      pinned: false,
    })
  })

  test('snapshot returns a copy', ({ assert }) => {
    const announcement = buildAnnouncement()

    const copy = announcement.snapshot()
    announcement.edit({ title: 'Mudou' }, LATER)

    assert.equal(copy.title, 'Jogo adiado')
  })
})
