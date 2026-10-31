import { USER_ROLE, left, right, type Either, type UserRole } from '@interclasse/shared'

import type { EnrollmentRemovalError } from './enrollment-removal.errors.ts'

export type EnrollmentRemovalProps = {
  readonly id: string
  readonly classroomId: string
  readonly sportId: string
  readonly studentId: string | null
  /** Copied, not just referenced: the student may leave the classroom and the notice keeps saying who it was. */
  readonly studentName: string
  readonly reason: string
  readonly actorId: string | null
  acknowledgedAt: Date | null
  readonly createdAt: Date
  updatedAt: Date | null
}

/**
 * The notice of an athlete removed from a sport, with the reason. The advisor removes
 * at any time, including after the draw, and the administrator receives the
 * notice with the justification (`_standards/domain.md` §1).
 */
export class EnrollmentRemoval {
  private constructor(private readonly props: EnrollmentRemovalProps) {}

  /**
   * Records the removal. The administrator does not notify themselves: their removal is
   * born already read.
   */
  static record(input: {
    readonly id: string
    readonly classroomId: string
    readonly sportId: string
    readonly studentId: string
    readonly studentName: string
    readonly reason: string
    readonly actorId: string
    readonly actorRole: UserRole
    readonly now: Date
  }): EnrollmentRemoval {
    let acknowledgedAt: Date | null = null
    if (input.actorRole === USER_ROLE.ADMINISTRATOR) acknowledgedAt = input.now

    return new EnrollmentRemoval({
      id: input.id,
      classroomId: input.classroomId,
      sportId: input.sportId,
      studentId: input.studentId,
      studentName: input.studentName,
      reason: input.reason,
      actorId: input.actorId,
      acknowledgedAt,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  /** Rehydration by the repository: the data passed through the invariants when it was saved. */
  static restore(props: EnrollmentRemovalProps): EnrollmentRemoval {
    return new EnrollmentRemoval({ ...props })
  }

  /** The administrator's acknowledgement. Repeating it does not change the first date. */
  acknowledge(at: Date): Either<EnrollmentRemovalError, EnrollmentRemoval> {
    if (this.props.acknowledgedAt) return left({ code: 'ENROLLMENT_REMOVAL_ALREADY_ACKNOWLEDGED' })

    this.props.acknowledgedAt = at
    this.props.updatedAt = at

    return right(this)
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<EnrollmentRemovalProps> {
    return { ...this.props }
  }
}
