import { randomInt } from 'node:crypto'

import { MatchPhases, type MatchPhase } from '#core/entity'

/**
 * As regras do torneio, puras: sorteio e avanço no mata-mata.
 *
 * Funções sobre dados em mãos, sem banco - é o que as deixa em `_shared` e não
 * num service (_padroes/backend.md §4.9), e o que permite testá-las sem
 * subir nada: `_shared.tournament.spec.ts`, ao lado.
 *
 * O formato é o da escola: mata-mata direto, do sorteio à final. Quando o
 * número de turmas não fecha uma potência de dois, as que sobram ficam de
 * folga e entram direto na fase seguinte.
 */

/** Sorteia um inteiro em `[0, max)`. Injetável para o teste ser determinístico. */
export type Random = (max: number) => number

/** Aleatoriedade criptográfica: um sorteio previsível seria um sorteio contestável. */
export const secureRandom: Random = (max) => randomInt(max)

/** Fisher-Yates. Não altera a lista recebida. */
export function shuffle<T>(items: ReadonlyArray<T>, random: Random = secureRandom): T[] {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index--) {
    const other = random(index + 1)
    const current = result[index]
    const swapped = result[other]
    // Índices dentro da lista por construção; a guarda só estreita o tipo.
    if (current === undefined || swapped === undefined) continue
    result[index] = swapped
    result[other] = current
  }

  return result
}

/** A fase pelo número de vagas que ela tem. */
const PHASE_BY_SIZE: Record<number, MatchPhase> = {
  2: MatchPhases.FINAL,
  4: MatchPhases.SEMI,
  8: MatchPhases.QUARTER,
  16: MatchPhases.ROUND_OF_16,
}

/** A maior chave que existe: oitavas de final. A escola tem até 13 turmas por categoria. */
export const MAX_TEAMS = 16

export function knockoutPhase(slots: number): MatchPhase | undefined {
  return PHASE_BY_SIZE[slots]
}

/** O tamanho da chave: a menor potência de dois que cabe todos os times. */
export function bracketSize(teams: number): number {
  let size = 2
  while (size < teams) size *= 2

  return size
}

/** Um confronto da primeira fase. `away` nulo é folga: o mandante avança direto. */
export type Pairing<T> = { home: T; away: T | null }

/**
 * O sorteio: embaralha e forma os confrontos da primeira fase.
 *
 * As folgas vão para os primeiros confrontos, uma por confronto - nunca dois
 * times de folga um contra o outro, que seria um jogo que não existe.
 */
export function drawKnockout<T>(
  teams: ReadonlyArray<T>,
  random: Random = secureRandom,
): Pairing<T>[] {
  const shuffled = shuffle(teams, random)
  const size = bracketSize(teams.length)
  const byes = size - teams.length
  const pairings: Pairing<T>[] = []

  let next = 0
  for (let position = 0; position < size / 2; position++) {
    const home = shuffled[next++]
    // `size` é a menor potência de dois que cabe os times: toda posição tem mandante.
    if (home === undefined) break

    if (position < byes) {
      pairings.push({ home, away: null })
      continue
    }

    pairings.push({ home, away: shuffled[next++] ?? null })
  }

  return pairings
}

/** A fase seguinte do mata-mata. A final não tem. */
const NEXT_PHASE: Partial<Record<MatchPhase, MatchPhase>> = {
  [MatchPhases.ROUND_OF_16]: MatchPhases.QUARTER,
  [MatchPhases.QUARTER]: MatchPhases.SEMI,
  [MatchPhases.SEMI]: MatchPhases.FINAL,
}

export function nextPhase(phase: MatchPhase): MatchPhase | undefined {
  return NEXT_PHASE[phase]
}

/**
 * Para onde vai o vencedor da partida na posição `position`: a posição
 * `position / 2` da fase seguinte, como mandante quando `position` é par.
 */
export function advanceSlot(position: number): { position: number; side: 'home' | 'away' } {
  if (position % 2 === 0) return { position: position / 2, side: 'home' }

  return { position: (position - 1) / 2, side: 'away' }
}
