import { randomUUID } from 'node:crypto'

import { BracketArrangements, MemoryBracketHarness } from '#tests/bracket-harness'
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
 * A montagem dos testes unitários de chave, partida e cartão: a chave e o que
 * ela lê (modalidade, turmas, alunos inscritos) no repositório em memória. O
 * arranjo em si é o mesmo do teste de contrato (`tests/bracket-harness.ts`).
 */
export class BracketUnitFixtures {
  /** Os contratos do use-case de chave trocados pelas implementações em memória. */
  static bindings(brackets: BracketMemoryRepository) {
    return [
      [BracketRepository, brackets],
      [UnitOfWork, new UnitOfWorkMemory()],
    ] as const
  }

  /** Os mesmos, mais o cartão, que lê a partida pelo repositório da chave. */
  static cardBindings(brackets: BracketMemoryRepository, cards: MatchCardMemoryRepository) {
    return [...BracketUnitFixtures.bindings(brackets), [MatchCardRepository, cards]] as const
  }

  /** O repositório de cartões em memória, com os alunos que ele só lê. */
  static cards(
    brackets: BracketMemoryRepository,
    students: ReadonlyArray<StudentView>,
  ): MatchCardMemoryRepository {
    const cards = new MatchCardMemoryRepository(brackets)
    for (const student of students)
      cards.withStudent({ ...student, createdAt: BracketArrangements.NOW, updatedAt: null })

    return cards
  }

  /** A modalidade e `names.length` turmas, cada uma com um aluno inscrito nela. */
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

  /** `total` turmas sorteadas e gravadas, sem embaralhar: o resultado é sempre o mesmo. */
  static async drawn(brackets: BracketMemoryRepository, total = 4) {
    return BracketArrangements.drawn(
      new MemoryBracketHarness(brackets),
      Array.from({ length: total }, (_, index) => `8º ${String.fromCharCode(65 + index)}`),
    )
  }
}
