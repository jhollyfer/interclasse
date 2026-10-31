import { left, right, type Either } from '@interclasse/shared'

import type { EnrollmentError } from './enrollment.errors.ts'

export type EnrollmentProps = {
  readonly classroomId: string
  readonly sportId: string
  studentIds: string[]
}

/**
 * Who writes the list, and what that allows.
 *
 * The representative only adds, and only before the draw. The advisor (and the
 * administrator, who covers for their absence) changes it at any time, including
 * after the draw, because the drawn team is the classroom and swapping who plays for it
 * does not change the bracket. Removing an athlete requires the reason.
 */
export type EnrollmentWriter =
  { readonly role: 'representative' } | { readonly role: 'advisor'; readonly reason?: string }

/** What the list swap left behind: who left it. */
export type EnrollmentReplaced = { readonly removedStudentIds: string[] }

/**
 * The athlete list of a classroom in a sport. The identity is the classroom and sport
 * pair; each student enters by id (`_standards/domain.md` §4).
 */
export class Enrollment {
  private constructor(private readonly props: EnrollmentProps) {}

  /** Rehydration by the repository: the data passed through the invariants when it was saved. */
  static restore(props: EnrollmentProps): Enrollment {
    return new Enrollment({ ...props, studentIds: [...props.studentIds] })
  }

  /**
   * Replaces the whole list with the received one. The list is whole, not one student at a
   * time: the screen is a column of checked boxes, and what it has to send is the
   * final state. Nothing changes when it returns `left`.
   *
   * The order of refusals is the screen's: limit, foreign student, then what depends
   * on who writes.
   */
  replace(
    input: { readonly studentIds: readonly string[]; readonly writer: EnrollmentWriter },
    context: {
      readonly maxAthletes: number
      readonly classroomStudentIds: readonly string[]
      readonly drawn: boolean
    },
  ): Either<EnrollmentError, EnrollmentReplaced> {
    if (input.studentIds.length > context.maxAthletes)
      return left({ code: 'ENROLLMENT_LIMIT_EXCEEDED', maxAthletes: context.maxAthletes })

    const ofClassroom = new Set(context.classroomStudentIds)
    if (!input.studentIds.every((id) => ofClassroom.has(id)))
      return left({ code: 'ENROLLMENT_STUDENT_NOT_IN_CLASSROOM' })

    const kept = new Set(input.studentIds)
    const removedStudentIds = this.props.studentIds.filter((id) => !kept.has(id))

    if (input.writer.role === 'representative') {
      if (removedStudentIds.length > 0) return left({ code: 'ENROLLMENT_REMOVAL_FORBIDDEN' })
      if (context.drawn) return left({ code: 'ENROLLMENT_LOCKED' })
    }

    if (input.writer.role === 'advisor' && removedStudentIds.length > 0 && !input.writer.reason)
      return left({ code: 'ENROLLMENT_REASON_REQUIRED' })

    this.props.studentIds = [...input.studentIds]

    return right({ removedStudentIds })
  }

  snapshot(): Readonly<EnrollmentProps> {
    return { ...this.props, studentIds: [...this.props.studentIds] }
  }
}
