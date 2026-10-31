import { test } from '@japa/runner'
import { MATCH_PHASE } from '@interclasse/shared'

import { Knockout } from './knockout.value-object.ts'

/**
 * The pure knockout rules, without database or HTTP. The draw receives a
 * deterministic generator so the result is reproducible.
 */

/** Deterministic linear generator: same result on every run. */
function seeded(seed: number) {
  let state = seed

  return (max: number) => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state % max
  }
}

const teams = (total: number) => Array.from({ length: total }, (_, index) => `T${index + 1}`)

test.group('tournament > draw', () => {
  test('the shuffle neither loses nor repeats anyone', ({ assert }) => {
    const times = teams(13)
    const shuffled = Knockout.shuffle(times, seeded(7))

    assert.sameMembers(shuffled, times)
    assert.notDeepEqual(shuffled, times)
  })

  test('the bracket is the smallest power of two that fits everyone', ({ assert }) => {
    assert.equal(Knockout.sizeFor(2), 2)
    assert.equal(Knockout.sizeFor(3), 4)
    assert.equal(Knockout.sizeFor(8), 8)
    assert.equal(Knockout.sizeFor(11), 16)
    assert.equal(Knockout.sizeFor(13), 16)
  })

  for (const total of [2, 3, 5, 8, 11, 13, 16]) {
    test(`with ${total} classrooms everyone enters once, and a bye never faces a bye`, ({
      assert,
    }) => {
      const pairings = Knockout.pair(teams(total), seeded(total))
      const presentes = pairings.flatMap((c) => [c.home, c.away]).filter((time) => time !== null)
      const byes = pairings.filter((c) => c.away === null).length

      assert.lengthOf(pairings, Knockout.sizeFor(total) / 2)
      assert.sameMembers(presentes, teams(total))
      assert.equal(byes, Knockout.sizeFor(total) - total)
    })
  }
})

test.group('tournament > knockout', () => {
  test('the phase comes from the number of slots', ({ assert }) => {
    assert.equal(Knockout.phaseOf(2), MATCH_PHASE.FINAL)
    assert.equal(Knockout.phaseOf(4), MATCH_PHASE.SEMI)
    assert.equal(Knockout.phaseOf(8), MATCH_PHASE.QUARTER)
    assert.equal(Knockout.phaseOf(16), MATCH_PHASE.ROUND_OF_16)
    assert.isUndefined(Knockout.phaseOf(6))
    assert.equal(Knockout.nextPhase(MATCH_PHASE.QUARTER), MATCH_PHASE.SEMI)
    assert.isUndefined(Knockout.nextPhase(MATCH_PHASE.FINAL))
  })

  test('the winner of the even position goes as home, the odd one as away', ({ assert }) => {
    assert.deepEqual(Knockout.advanceSlot(0), { position: 0, side: 'home' })
    assert.deepEqual(Knockout.advanceSlot(1), { position: 0, side: 'away' })
    assert.deepEqual(Knockout.advanceSlot(2), { position: 1, side: 'home' })
    assert.deepEqual(Knockout.advanceSlot(3), { position: 1, side: 'away' })
  })
})
