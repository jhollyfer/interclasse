import { test } from '@japa/runner'

import { Sport } from './sport.entity.ts'

const NOW = new Date('2026-10-29T12:00:00Z')

function futsal(): Sport {
  return Sport.restore({
    id: 'futsal',
    name: 'Futsal',
    slug: 'futsal',
    minAthletes: 5,
    maxAthletes: 12,
    createdAt: NOW,
    updatedAt: null,
  })
}

test.group('Sport', () => {
  test('is born with the name slug', ({ assert }) => {
    const sport = Sport.create({
      id: 'id',
      name: 'Tênis de mesa',
      minAthletes: 1,
      maxAthletes: 2,
      now: NOW,
    })

    assert.isTrue(sport.isRight())
    assert.equal(sport.isRight() && sport.value.snapshot().slug, 'tenis-de-mesa')
  })

  test('refuses a minimum above the maximum on birth and on change', ({ assert }) => {
    const born = Sport.create({ id: 'id', name: 'Vôlei', minAthletes: 9, maxAthletes: 6, now: NOW })
    const changed = futsal().update({ minAthletes: 13 }, { largestRoster: 0, now: NOW })

    assert.deepEqual(born.value, { code: 'SPORT_INVALID_LIMITS' })
    assert.deepEqual(changed.value, { code: 'SPORT_INVALID_LIMITS' })
  })

  test('the maximum does not go below the largest enrolled roster', ({ assert }) => {
    const refused = futsal().update({ maxAthletes: 8 }, { largestRoster: 10, now: NOW })
    const accepted = futsal().update({ maxAthletes: 10 }, { largestRoster: 10, now: NOW })

    assert.deepEqual(refused.value, { code: 'SPORT_ROSTER_ABOVE_LIMIT', largestRoster: 10 })
    assert.isTrue(accepted.isRight())
  })

  test('renaming changes the slug and stamps the edit', ({ assert }) => {
    const sport = futsal()
    sport.update({ name: 'Futsal masculino' }, { largestRoster: 0, now: NOW })

    assert.deepInclude(sport.snapshot(), {
      name: 'Futsal masculino',
      slug: 'futsal-masculino',
      updatedAt: NOW,
    })
  })
})
