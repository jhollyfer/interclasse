import { randomUUID } from 'node:crypto'

import { CATEGORY, type AdministratorSportShowResponse, type Category } from '@interclasse/shared'

import { Bracket } from '#domain/bracket/bracket.entity'
import type {
  BracketMemoryRepository,
  ClassroomView,
} from '#repositories/bracket/bracket.memory.repository'
import { BracketRepository } from '#repositories/bracket/bracket.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UnitOfWorkMemory } from '#repositories/unit-of-work/unit-of-work.memory'

const NOW = new Date('2026-10-29T12:00:00.000Z')

/**
 * A montagem dos testes unitários de chave, partida e cartão: a chave e o que
 * ela lê (modalidade, turmas, alunos inscritos) no repositório em memória.
 */
export class BracketUnitFixtures {
  /** Os contratos do use-case de chave trocados pelas implementações em memória. */
  static bindings(brackets: BracketMemoryRepository) {
    return [
      [BracketRepository, brackets],
      [UnitOfWork, new UnitOfWorkMemory()],
    ] as const
  }

  static sport(name = 'Futsal', minAthletes = 1): AdministratorSportShowResponse {
    return {
      id: randomUUID(),
      name,
      slug: name.toLowerCase(),
      minAthletes,
      maxAthletes: 10,
      createdAt: NOW.toISOString(),
      updatedAt: null,
    }
  }

  static classroom(name: string, category: Category = CATEGORY.F2): ClassroomView {
    return {
      id: randomUUID(),
      name,
      grade: 8,
      category,
      advisorId: null,
      representativeId: null,
      createdAt: NOW,
      updatedAt: null,
    }
  }

  /** A modalidade e `names.length` turmas, cada uma com um aluno inscrito nela. */
  static enrolled(brackets: BracketMemoryRepository, names: ReadonlyArray<string>) {
    const sport = BracketUnitFixtures.sport()
    brackets.withSport(sport)

    const classrooms = names.map((name) => BracketUnitFixtures.classroom(name))
    for (const classroom of classrooms) {
      brackets.withClassroom(classroom)
      brackets.withStudent(
        { id: randomUUID(), name: `Aluno ${classroom.name}`, classroomId: classroom.id },
        [sport.id],
      )
    }

    return { sport, classrooms }
  }

  /** Quatro turmas sorteadas e gravadas, sem embaralhar: o resultado é sempre o mesmo. */
  static async drawn(brackets: BracketMemoryRepository, total = 4) {
    const { sport, classrooms } = BracketUnitFixtures.enrolled(
      brackets,
      Array.from({ length: total }, (_, index) => `8º ${String.fromCharCode(65 + index)}`),
    )
    const result = Bracket.draw({
      id: randomUUID(),
      sportId: sport.id,
      category: CATEGORY.F2,
      minAthletes: sport.minAthletes,
      classroomIds: classrooms.map((classroom) => classroom.id),
      newId: () => randomUUID(),
      random: () => 0,
      now: NOW,
    })
    if (result.isLeft()) throw new Error('sorteio inválido no arranjo')

    await brackets.save(result.value)

    return { bracket: result.value, sport, classrooms }
  }
}
