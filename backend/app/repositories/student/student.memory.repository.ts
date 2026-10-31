import {
  USER_ROLE,
  type Actor,
  type AdvisorStudentShowResponse,
  type Paginated,
} from '@interclasse/shared'

import { StudentRepository, type StudentListCriteria } from './student.repository.ts'

import { Student, type StudentProps } from '#domain/student/student.entity'
import { MemoryPagination } from '#core/memory-pagination'

/**
 * The second real implementation, for the use case unit test
 * (`_standards/domain.md` §5.3). It keeps copies: the test does not change the "database"
 * by reference.
 */
export class StudentMemoryRepository extends StudentRepository {
  private readonly rows = new Map<string, StudentProps>()
  /** The advisor of each classroom: what the test arranges from the `classrooms` table. */
  private readonly advisors = new Map<string, string | null>()
  private readonly drawn = new Set<string>()

  /** Test arrangement: the classroom exists, with this advisor. */
  withClassroom(classroomId: string, advisorId: string | null): this {
    this.advisors.set(classroomId, advisorId)
    return this
  }

  /** Test arrangement: the student is enrolled in an already drawn sport. */
  markInDrawnSport(studentId: string): this {
    this.drawn.add(studentId)
    return this
  }

  async findOwned(criteria: {
    readonly id: string
    readonly actor: Actor
  }): Promise<Student | null> {
    const props = this.rows.get(criteria.id)
    if (!props || !this.reaches(criteria.actor, props.classroomId)) return null

    return Student.restore(structuredClone(props))
  }

  async isInDrawnSport(studentId: string): Promise<boolean> {
    return this.drawn.has(studentId)
  }

  async save(student: Student): Promise<void> {
    this.rows.set(student.id, structuredClone(student.snapshot()))
  }

  async delete(student: Student): Promise<void> {
    this.rows.delete(student.id)
  }

  async paginate(criteria: StudentListCriteria): Promise<Paginated<AdvisorStudentShowResponse>> {
    const search = criteria.search?.toLowerCase()
    const all = [...this.rows.values()]
      .filter((row) => this.reaches(criteria.actor, row.classroomId))
      .filter((row) => !criteria.classroomId || row.classroomId === criteria.classroomId)
      .filter((row) => !search || row.name.toLowerCase().includes(search))
      .sort((a, b) => a.name.localeCompare(b.name))
    const page = MemoryPagination.slice(all, criteria.page, criteria.perPage)

    return {
      meta: page.meta,
      data: page.data.map((row) => ({
        id: row.id,
        classroomId: row.classroomId,
        name: row.name,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt?.toISOString() ?? null,
      })),
    }
  }

  /** The administrator reaches all classrooms; the others, the one they advise. */
  private reaches(actor: Actor, classroomId: string): boolean {
    return actor.role === USER_ROLE.ADMINISTRATOR || this.advisors.get(classroomId) === actor.id
  }
}
