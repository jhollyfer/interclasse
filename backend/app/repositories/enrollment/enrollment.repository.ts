import type { AdvisorEnrollmentShowResponse } from '@interclasse/shared'

import type { Enrollment } from '#domain/enrollment/enrollment.entity'

/** What the list needs to know about the sport: the athlete ceiling. */
export type EnrollmentSport = {
  readonly id: string
  readonly maxAthletes: number
}

/** A student of the classroom: the id for the list and the name for the removal notice. */
export type EnrollmentStudent = {
  readonly id: string
  readonly name: string
}

/** The list of a classroom in a sport. */
export type EnrollmentKey = {
  readonly classroomId: string
  readonly sportId: string
}

/**
 * The athlete list persistence, by intent (`_standards/domain.md` §5.1).
 * The single writer of the `enrollments` table; it reads `sports`, `students`, `classrooms`
 * and `brackets` only to answer what the list rule asks.
 */
export abstract class EnrollmentRepository {
  abstract findSport(sportId: string): Promise<EnrollmentSport | null>
  /** The classroom's students, by name. */
  abstract studentsOf(classroomId: string): Promise<EnrollmentStudent[]>
  /** The sport was already drawn in the classroom's category. */
  abstract isDrawn(key: EnrollmentKey): Promise<boolean>
  /**
   * The current list, after locking the sport row. The same lock as the
   * draw: the draw check only holds after it, because read before, the list
   * could be saved after the bracket closed (`backend.md` §4.11). Only
   * inside a unit of work.
   */
  abstract findForUpdate(key: EnrollmentKey): Promise<Enrollment>
  /** Swaps the classroom's saved list in this sport for the entity's. */
  abstract save(enrollment: Enrollment): Promise<void>
  /**
   * The student x sport matrix of the classroom, straight from the query. `lockAfterDraw` is
   * what differentiates the two screens: only the representative's locks on the
   * drawn sport. `null` when the classroom does not exist.
   */
  abstract board(criteria: {
    readonly classroomId: string
    readonly lockAfterDraw: boolean
  }): Promise<AdvisorEnrollmentShowResponse | null>
}
