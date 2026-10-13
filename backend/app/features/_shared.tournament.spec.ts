import { test } from '@japa/runner'

import {
  advanceSlot,
  bracketSize,
  drawKnockout,
  knockoutPhase,
  nextPhase,
  shuffle,
} from '#features/_shared.tournament'
import { MATCH_PHASE } from '#core/entity'

/**
 * As regras puras do mata-mata, sem banco nem HTTP.
 *
 * Funcional e não unitário só porque é a única suíte do padrão; nada aqui toca a
 * aplicação. O sorteio recebe um gerador determinístico para o resultado ser
 * reproduzível.
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
    const embaralhado = shuffle(times, seeded(7))

    assert.sameMembers(embaralhado, times)
    assert.notDeepEqual(embaralhado, times)
  })

  test('a chave é a menor potência de dois que cabe todo mundo', ({ assert }) => {
    assert.equal(bracketSize(2), 2)
    assert.equal(bracketSize(3), 4)
    assert.equal(bracketSize(8), 8)
    assert.equal(bracketSize(11), 16)
    assert.equal(bracketSize(13), 16)
  })

  for (const total of [2, 3, 5, 8, 11, 13, 16]) {
    test(`com ${total} turmas todo mundo entra uma vez, e folga nunca enfrenta folga`, ({
      assert,
    }) => {
      const confrontos = drawKnockout(turmas(total), seeded(total))
      const presentes = confrontos.flatMap((c) => [c.home, c.away]).filter((time) => time !== null)
      const folgas = confrontos.filter((c) => c.away === null).length

      assert.lengthOf(confrontos, bracketSize(total) / 2)
      assert.sameMembers(presentes, turmas(total))
      assert.equal(folgas, bracketSize(total) - total)
    })
  }
})

test.group('torneio > mata-mata', () => {
  test('a fase sai do número de vagas', ({ assert }) => {
    assert.equal(knockoutPhase(2), MATCH_PHASE.FINAL)
    assert.equal(knockoutPhase(4), MATCH_PHASE.SEMI)
    assert.equal(knockoutPhase(8), MATCH_PHASE.QUARTER)
    assert.equal(knockoutPhase(16), MATCH_PHASE.ROUND_OF_16)
    assert.isUndefined(knockoutPhase(6))
    assert.equal(nextPhase(MATCH_PHASE.QUARTER), MATCH_PHASE.SEMI)
    assert.isUndefined(nextPhase(MATCH_PHASE.FINAL))
  })

  test('o vencedor da posição par vai como mandante, o da ímpar como visitante', ({ assert }) => {
    assert.deepEqual(advanceSlot(0), { position: 0, side: 'home' })
    assert.deepEqual(advanceSlot(1), { position: 0, side: 'away' })
    assert.deepEqual(advanceSlot(2), { position: 1, side: 'home' })
    assert.deepEqual(advanceSlot(3), { position: 1, side: 'away' })
  })
})
