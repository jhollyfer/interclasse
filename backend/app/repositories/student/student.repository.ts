import type { Actor, AdvisorStudentShowResponse, Paginated } from '@interclasse/shared'

import type { Student } from '#domain/student/student.entity'

export type StudentListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly classroomId?: string
  readonly actor: Actor
}

/**
 * The student persistence, by intent (`_standards/domain.md` §5.1). The single
 * writer of the `students` table; it reads `classrooms`, `enrollments` and `brackets` only to
 * answer the scope of whoever acts and what the draw has already locked.
 */
export abstract class StudentRepository {
  /**
   * A classroom's student within reach of whoever acts: the administrator reaches all, the
   * advisor their own. A foreign student comes back `null`, same as a nonexistent one
   * (`backend.md` §4.6).
   */
  abstract findOwned(criteria: {
    readonly id: string
    readonly actor: Actor
  }): Promise<Student | null>
  /** The student is enrolled in a sport already drawn in their classroom's category. */
  abstract isInDrawnSport(studentId: string): Promise<boolean>
  abstract save(student: Student): Promise<void>
  abstract delete(student: Student): Promise<void>
  /** Lightweight read: the response shape straight from the query, without hydrating an entity. */
  abstract paginate(criteria: StudentListCriteria): Promise<Paginated<AdvisorStudentShowResponse>>
}
