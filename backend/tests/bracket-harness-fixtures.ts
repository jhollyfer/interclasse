import { randomUUID } from 'node:crypto'

import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { CATEGORY, type AdministratorSportShowResponse } from '@interclasse/shared'

import { Bracket } from '#domain/bracket/bracket.entity'
import { BracketLucidRepository } from '#repositories/bracket/bracket.lucid.repository'
import {
  BracketMemoryRepository,
  type ClassroomView,
  type StudentView,
} from '#repositories/bracket/bracket.memory.repository'
import type { BracketRepository } from '#repositories/bracket/bracket.repository'

/**
 * The arrangement of the bracket and card contract test (`_standards/domain.md`
 * §5.4). Sport, classroom, student and enrollment are what the bracket only reads: each
 * implementation arranges them its own way (database rows, or the in-memory map),
 * and the same test runs on both.
 */
export type BracketHarness = {
  readonly repository: BracketRepository
  sport(sport: AdministratorSportShowResponse): Promise<void>
  classroom(classroom: ClassroomView): Promise<void>
  student(student: StudentView, enrolledIn: ReadonlyArray<string>): Promise<void>
}

export class LucidBracketHarness implements BracketHarness {
  constructor(readonly repository: BracketRepository) {}

  async sport(sport: AdministratorSportShowResponse): Promise<void> {
    await db.table('sports').insert({
      id: sport.id,
      name: sport.name,
      slug: sport.slug,
      min_athletes: sport.minAthletes,
      max_athletes: sport.maxAthletes,
      created_at: new Date(sport.createdAt),
    })
  }

  async classroom(classroom: ClassroomView): Promise<void> {
    await db.table('classrooms').insert({
      id: classroom.id,
      name: classroom.name,
      grade: classroom.grade,
      category: classroom.category,
      created_at: classroom.createdAt,
    })
  }

  async student(student: StudentView, enrolledIn: ReadonlyArray<string>): Promise<void> {
    await db.table('students').insert({
      id: student.id,
      name: student.name,
      classroom_id: student.classroomId,
      created_at: new Date(),
    })
    for (const sportId of enrolledIn)
      await db.table('enrollments').insert({
        student_id: student.id,
        sport_id: sportId,
        created_at: new Date(),
      })
  }
}

export class MemoryBracketHarness implements BracketHarness {
  constructor(readonly repository: BracketMemoryRepository) {}

  async sport(sport: AdministratorSportShowResponse): Promise<void> {
    this.repository.withSport(sport)
  }

  async classroom(classroom: ClassroomView): Promise<void> {
    this.repository.withClassroom(classroom)
  }

  async student(student: StudentView, enrolledIn: ReadonlyArray<string>): Promise<void> {
    this.repository.withStudent(student, enrolledIn)
  }
}

export class BracketArrangements {
  static readonly NOW = new Date('2026-10-29T12:00:00.000Z')

  static async lucid(): Promise<LucidBracketHarness> {
    return new LucidBracketHarness(await app.container.make(BracketLucidRepository))
  }

  static memory(): MemoryBracketHarness {
    return new MemoryBracketHarness(new BracketMemoryRepository())
  }

  static sport(name: string, minAthletes = 1): AdministratorSportShowResponse {
    return {
      id: randomUUID(),
      name,
      slug: name.toLowerCase(),
      minAthletes,
      maxAthletes: 10,
      createdAt: BracketArrangements.NOW.toISOString(),
      updatedAt: null,
    }
  }

  static classroom(name: string, grade = 8): ClassroomView {
    return {
      id: randomUUID(),
      name,
      grade,
      category: CATEGORY.F2,
      advisorId: null,
      representativeId: null,
      createdAt: BracketArrangements.NOW,
      updatedAt: null,
    }
  }

  /** The sport, `names.length` classrooms with one enrolled athlete each, and the saved draw. */
  static async drawn(harness: BracketHarness, names: string[], sportName = 'Futsal') {
    const sport = BracketArrangements.sport(sportName)
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

    const result = Bracket.draw({
      id: randomUUID(),
      sportId: sport.id,
      category: CATEGORY.F2,
      minAthletes: 1,
      classroomIds: classrooms.map((classroom) => classroom.id),
      newId: () => randomUUID(),
      random: () => 0,
      now: BracketArrangements.NOW,
    })
    if (result.isLeft()) throw new Error('invalid draw in the arrangement')

    await harness.repository.save(result.value)

    return { sport, classrooms, students, bracket: result.value }
  }
}
