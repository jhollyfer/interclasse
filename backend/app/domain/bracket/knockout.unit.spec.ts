import { test } from '@japa/runner'
import { MATCH_PHASE } from '@interclasse/shared'

import { Knockout } from './knockout.ts'

/**
 * As regras puras do mata-mata, sem banco nem HTTP. O sorteio recebe um gerador
 * determinístico para o resultado ser reproduzível.
 */

/** Gerador linear determinístico: mesmo resultado a cada execução. */
function seeded(seed: number) {
  let state = seed

  return (max: number) => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state % max
  }
}

const turmas = (total: number) => Array.from({ length: total }, (_, index) => `T${index + 1}`)

test.group('torneio > sorteio', () => {
  test('o embaralhamento não perde nem repete ninguém', ({ assert }) => {
    const times = turmas(13)
    const embaralhado = Knockout.shuffle(times, seeded(7))

    assert.sameMembers(embaralhado, times)
    assert.notDeepEqual(embaralhado, times)
  })

  test('a chave é a menor potência de dois que cabe todo mundo', ({ assert }) => {
    assert.equal(Knockout.sizeFor(2), 2)
    assert.equal(Knockout.sizeFor(3), 4)
    assert.equal(Knockout.sizeFor(8), 8)
    assert.equal(Knockout.sizeFor(11), 16)
    assert.equal(Knockout.sizeFor(13), 16)
  })

  for (const total of [2, 3, 5, 8, 11, 13, 16]) {
    test(`com ${total} turmas todo mundo entra uma vez, e folga nunca enfrenta folga`, ({
      assert,
    }) => {
      const confrontos = Knockout.pair(turmas(total), seeded(total))
      const presentes = confrontos.flatMap((c) => [c.home, c.away]).filter((time) => time !== null)
      const folgas = confrontos.filter((c) => c.away === null).length

      assert.lengthOf(confrontos, Knockout.sizeFor(total) / 2)
      assert.sameMembers(presentes, turmas(total))
      assert.equal(folgas, Knockout.sizeFor(total) - total)
    })
  }
})

test.group('torneio > mata-mata', () => {
  test('a fase sai do número de vagas', ({ assert }) => {
    assert.equal(Knockout.phaseOf(2), MATCH_PHASE.FINAL)
    assert.equal(Knockout.phaseOf(4), MATCH_PHASE.SEMI)
    assert.equal(Knockout.phaseOf(8), MATCH_PHASE.QUARTER)
    assert.equal(Knockout.phaseOf(16), MATCH_PHASE.ROUND_OF_16)
    assert.isUndefined(Knockout.phaseOf(6))
    assert.equal(Knockout.nextPhase(MATCH_PHASE.QUARTER), MATCH_PHASE.SEMI)
    assert.isUndefined(Knockout.nextPhase(MATCH_PHASE.FINAL))
  })

  test('o vencedor da posição par vai como mandante, o da ímpar como visitante', ({ assert }) => {
    assert.deepEqual(Knockout.advanceSlot(0), { position: 0, side: 'home' })
    assert.deepEqual(Knockout.advanceSlot(1), { position: 0, side: 'away' })
    assert.deepEqual(Knockout.advanceSlot(2), { position: 1, side: 'home' })
    assert.deepEqual(Knockout.advanceSlot(3), { position: 1, side: 'away' })
  })
})
