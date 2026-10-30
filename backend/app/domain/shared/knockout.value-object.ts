import { MATCH_PHASE, type MatchPhase } from '@interclasse/shared'

/** Sorteia um inteiro em `[0, max)`. Injetável para o teste ser determinístico. */
export type Random = (max: number) => number

/** Um confronto da primeira fase. `away` nulo é folga: o mandante avança direto. */
export type Pairing<T> = { readonly home: T; readonly away: T | null }

/** Para onde vai o vencedor: a posição na fase seguinte e o lado em que entra. */
export type AdvanceSlot = { readonly position: number; readonly side: 'home' | 'away' }

/**
 * As regras puras do mata-mata: sorteio, tamanho da chave, fase e avanço
 * (`_standards/domain.md` §4). Sobre dados em mãos, sem banco nem relógio - o
 * sorteio recebe o `Random`, e é isso que o deixa testável.
 *
 * O formato é o da escola: mata-mata direto, do sorteio à final. Quando o
 * número de turmas não fecha uma potência de dois, as que sobram ficam de
 * folga e entram direto na fase seguinte.
 */
export class Knockout {
  /** Com menos de dois times não há partida a jogar. */
  static readonly MIN_TEAMS = 2

  /** A maior chave que existe: oitavas de final. A escola tem até 13 turmas por categoria. */
  static readonly MAX_TEAMS = 16

  /** A fase pelo número de vagas que ela tem. */
  private static readonly PHASE_BY_SIZE: Readonly<Record<number, MatchPhase>> = {
    2: MATCH_PHASE.FINAL,
    4: MATCH_PHASE.SEMI,
    8: MATCH_PHASE.QUARTER,
    16: MATCH_PHASE.ROUND_OF_16,
  }

  /** A fase seguinte do mata-mata. A final não tem. */
  private static readonly NEXT_PHASE: Readonly<Partial<Record<MatchPhase, MatchPhase>>> = {
    [MATCH_PHASE.ROUND_OF_16]: MATCH_PHASE.QUARTER,
    [MATCH_PHASE.QUARTER]: MATCH_PHASE.SEMI,
    [MATCH_PHASE.SEMI]: MATCH_PHASE.FINAL,
  }

  /** Fisher-Yates. Não altera a lista recebida. */
  static shuffle<T>(items: ReadonlyArray<T>, random: Random): T[] {
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

  static phaseOf(slots: number): MatchPhase | undefined {
    return Knockout.PHASE_BY_SIZE[slots]
  }

  static nextPhase(phase: MatchPhase): MatchPhase | undefined {
    return Knockout.NEXT_PHASE[phase]
  }

  /** O tamanho da chave: a menor potência de dois que cabe todos os times. */
  static sizeFor(teams: number): number {
    let size = 2
    while (size < teams) size *= 2

    return size
  }

  /**
   * O sorteio: embaralha e forma os confrontos da primeira fase.
   *
   * As folgas vão para os primeiros confrontos, uma por confronto - nunca dois
   * times de folga um contra o outro, que seria um jogo que não existe.
   */
  static pair<T>(teams: ReadonlyArray<T>, random: Random): Pairing<T>[] {
    const shuffled = Knockout.shuffle(teams, random)
    const size = Knockout.sizeFor(teams.length)
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

  /**
   * Para onde vai o vencedor da partida na posição `position`: a posição
   * `position / 2` da fase seguinte, como mandante quando `position` é par.
   */
  static advanceSlot(position: number): AdvanceSlot {
    if (position % 2 === 0) return { position: position / 2, side: 'home' }

    return { position: (position - 1) / 2, side: 'away' }
  }
}
