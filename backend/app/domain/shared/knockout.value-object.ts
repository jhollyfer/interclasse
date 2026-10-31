import { MATCH_PHASE, type MatchPhase } from '@interclasse/shared'

/** Draws an integer in `[0, max)`. Injectable so the test is deterministic. */
export type Random = (max: number) => number

/** A first-phase matchup. A null `away` is a bye: the home team advances straight. */
export type Pairing<T> = { readonly home: T; readonly away: T | null }

/** Where the winner goes: the position in the next phase and the side they enter on. */
export type AdvanceSlot = { readonly position: number; readonly side: 'home' | 'away' }

/**
 * The pure knockout rules: draw, bracket size, phase and advance
 * (`_standards/domain.md` §4). Over data in hand, no database or clock - the
 * draw receives the `Random`, and that is what makes it testable.
 *
 * The format is the school's: straight knockout, from the draw to the final. When the
 * number of classrooms does not fill a power of two, the leftovers get a
 * bye and enter the next phase directly.
 */
export class Knockout {
  /** With fewer than two teams there is no match to play. */
  static readonly MIN_TEAMS = 2

  /** The largest bracket that exists: round of 16. The school has up to 13 classrooms per category. */
  static readonly MAX_TEAMS = 16

  /** The phase by the number of slots it has. */
  private static readonly PHASE_BY_SIZE: Readonly<Record<number, MatchPhase>> = {
    2: MATCH_PHASE.FINAL,
    4: MATCH_PHASE.SEMI,
    8: MATCH_PHASE.QUARTER,
    16: MATCH_PHASE.ROUND_OF_16,
  }

  /** The next knockout phase. The final has none. */
  private static readonly NEXT_PHASE: Readonly<Partial<Record<MatchPhase, MatchPhase>>> = {
    [MATCH_PHASE.ROUND_OF_16]: MATCH_PHASE.QUARTER,
    [MATCH_PHASE.QUARTER]: MATCH_PHASE.SEMI,
    [MATCH_PHASE.SEMI]: MATCH_PHASE.FINAL,
  }

  /** Fisher-Yates. Does not alter the received list. */
  static shuffle<T>(items: ReadonlyArray<T>, random: Random): T[] {
    const result = [...items]

    for (let index = result.length - 1; index > 0; index--) {
      const other = random(index + 1)
      const current = result[index]
      const swapped = result[other]
      // Indices within the list by construction; the guard only narrows the type.
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

  /** The bracket size: the smallest power of two that fits all the teams. */
  static sizeFor(teams: number): number {
    let size = 2
    while (size < teams) size *= 2

    return size
  }

  /**
   * The draw: shuffles and forms the first-phase matchups.
   *
   * The byes go to the first matchups, one per matchup - never two
   * bye teams against each other, which would be a match that does not exist.
   */
  static pair<T>(teams: ReadonlyArray<T>, random: Random): Pairing<T>[] {
    const shuffled = Knockout.shuffle(teams, random)
    const size = Knockout.sizeFor(teams.length)
    const byes = size - teams.length
    const pairings: Pairing<T>[] = []

    let next = 0
    for (let position = 0; position < size / 2; position++) {
      const home = shuffled[next++]
      // `size` is the smallest power of two that fits the teams: every position has a home team.
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
   * Where the winner of the match at position `position` goes: position
   * `position / 2` of the next phase, as home team when `position` is even.
   */
  static advanceSlot(position: number): AdvanceSlot {
    if (position % 2 === 0) return { position: position / 2, side: 'home' }

    return { position: (position - 1) / 2, side: 'away' }
  }
}
