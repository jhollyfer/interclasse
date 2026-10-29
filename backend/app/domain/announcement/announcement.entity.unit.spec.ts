import { test } from '@japa/runner'

import { Announcement } from './announcement.entity.ts'

const NOW = new Date('2026-10-29T12:00:00Z')
const LATER = new Date('2026-10-30T12:00:00Z')

function aviso(): Announcement {
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
  test('nasce sem destaque quando não pedem', ({ assert }) => {
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

  test('nasce fixado quando pedem', ({ assert }) => {
    const announcement = Announcement.create({
      id: 'id',
      title: 'T',
      body: 'B',
      pinned: true,
      now: NOW,
    })

    assert.isTrue(announcement.snapshot().pinned)
  })

  test('editar muda só o que veio e carimba a edição', ({ assert }) => {
    const announcement = aviso()

    announcement.edit({ pinned: true }, LATER)

    assert.deepInclude(announcement.snapshot(), {
      title: 'Jogo adiado',
      body: 'A partida foi para as 15h.',
      pinned: true,
      updatedAt: LATER,
    })
  })

  test('editar título e texto troca os dois e mantém o destaque', ({ assert }) => {
    const announcement = aviso()

    announcement.edit({ title: 'Novo', body: 'Outro texto' }, LATER)

    assert.deepInclude(announcement.snapshot(), {
      title: 'Novo',
      body: 'Outro texto',
      pinned: false,
    })
  })

  test('snapshot devolve cópia', ({ assert }) => {
    const announcement = aviso()

    const copy = announcement.snapshot()
    announcement.edit({ title: 'Mudou' }, LATER)

    assert.equal(copy.title, 'Jogo adiado')
  })
})
