import { randomUUID } from 'node:crypto'

import { BracketArrangements, MemoryBracketHarness } from '#tests/bracket-harness-fixtures'
import type {
  BracketMemoryRepository,
  StudentView,
} from '#repositories/bracket/bracket.memory.repository'
import { BracketRepository } from '#repositories/bracket/bracket.repository'
import { MatchCardMemoryRepository } from '#repositories/match-card/match-card.memory.repository'
import { MatchCardRepository } from '#repositories/match-card/match-card.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UnitOfWorkMemory } from '#repositories/unit-of-work/unit-of-work.memory'

/**
 * The assembly of the bracket, match and card unit tests: the bracket and what it
 * reads (sport, classrooms, enrolled students) in the in-memory repository. The
 * arrangement itself is the same as the contract test (`tests/bracket-harness-fixtures.ts`).
 */
export class BracketUnitFixtures {
  /** The bracket use case contracts swapped for the in-memory implementations. */
  static bindings(brackets: BracketMemoryRepository) {
    return [
      [BracketRepository, brackets],
      [UnitOfWork, new UnitOfWorkMemory()],
    ] as const
  }

  /** The same, plus the card, which reads the match through the bracket repository. */
  static cardBindings(brackets: BracketMemoryRepository, cards: MatchCardMemoryRepository) {
    return [...BracketUnitFixtures.bindings(brackets), [MatchCardRepository, cards]] as const
  }

  /** The in-memory card repository, with the students it only reads. */
  static cards(
    brackets: BracketMemoryRepository,
    students: ReadonlyArray<StudentView>,
  ): MatchCardMemoryRepository {
    const cards = new MatchCardMemoryRepository(brackets)
    for (const student of students)
      cards.withStudent({ ...student, createdAt: BracketArrangements.NOW, updatedAt: null })

    return cards
  }

  /** The sport and `names.length` classrooms, each with one student enrolled in it. */
  static async enrolled(brackets: BracketMemoryRepository, names: ReadonlyArray<string>) {
    const harness = new MemoryBracketHarness(brackets)
    const sport = BracketArrangements.sport('Futsal')
    await harness.sport(sport)

    const classrooms = names.map((name) => BracketArrangements.classroom(name))
    const students: StudentView[] = []
    for (const classroom of classrooms) {
      const student = {
        id: randomUUID(),
        name: `Aluno ${classroom.name}`,
        classroomId: classroom.id,
      }
      await harness.classroom(classroom)
      await harness.student(student, [sport.id])
      students.push(student)
    }

    return { sport, classrooms, students }
  }

  /** `total` classrooms drawn and saved, without shuffling: the result is always the same. */
  static async drawn(brackets: BracketMemoryRepository, total = 4) {
    return BracketArrangements.drawn(
      new MemoryBracketHarness(brackets),
      Array.from({ length: total }, (_, index) => `8º ${String.fromCharCode(65 + index)}`),
    )
  }
}
