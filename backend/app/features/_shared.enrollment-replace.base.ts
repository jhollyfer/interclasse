import { randomUUID } from 'node:crypto'

import { type I18n } from '@adonisjs/i18n'
import {
  left,
  right,
  type Actor,
  type AdvisorEnrollmentShowResponse,
  type Either,
} from '@interclasse/shared'

import { EnrollmentRefusal } from '#features/advisor/enrollments/_shared.enrollment-refusal'
import { type EnrollmentWriter } from '#domain/enrollment/enrollment.entity'
import { EnrollmentRemoval } from '#domain/enrollment-removal/enrollment-removal.entity'
import { type EnrollmentRemovalRepository } from '#repositories/enrollment-removal/enrollment-removal.repository'
import { type EnrollmentRepository } from '#repositories/enrollment/enrollment.repository'
import { type UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import HTTPException from '#exceptions/http.exception'

type Replacement = {
  readonly classroomId: string
  readonly sportId: string
  readonly studentIds: readonly string[]
  readonly writer: EnrollmentWriter
  readonly actor: Actor
  /** Only the representative screen locks on an already drawn sport. */
  readonly lockAfterDraw: boolean
}

/**
 * The flow of replacing a classroom's athlete list, the same for the advisor
 * (`/advisor/enrollments`) and the representative (`/representative/enrollments`):
 * each use case finds the classroom its own way and hands the rest to this step
 * (template method, `backend.md` §4.2). Who may touch which classroom is **not**
 * decided here: it arrives resolved by the use case.
 *
 * Two writes, one unit of work: the new list and the removal notices
 * land together or neither does. They write two aggregates (`Enrollment` and
 * `EnrollmentRemoval`) because the notice is the consequence of the same swap.
 */
export abstract class EnrollmentReplaceBase {
  protected constructor(
    protected readonly enrollments: EnrollmentRepository,
    protected readonly removals: EnrollmentRemovalRepository,
    protected readonly unit: UnitOfWork,
    protected readonly i18n: I18n,
  ) {}

  protected async replace(
    input: Replacement,
  ): Promise<Either<HTTPException, AdvisorEnrollmentShowResponse>> {
    const sport = await this.enrollments.findSport(input.sportId)
    if (!sport) return left(EnrollmentRefusal.sportNotFound(this.i18n))

    const students = await this.enrollments.studentsOf(input.classroomId)
    const key = { classroomId: input.classroomId, sportId: input.sportId }

    const saved = await this.unit.run<HTTPException, true>(async () => {
      // The same lock as the draw, and the draw check only after it: read
      // before, the list could be saved after the bracket was closed.
      const enrollment = await this.enrollments.findForUpdate(key)
      const drawn = await this.enrollments.isDrawn(key)

      const replaced = enrollment.replace(
        { studentIds: input.studentIds, writer: input.writer },
        {
          maxAthletes: sport.maxAthletes,
          classroomStudentIds: students.map((student) => student.id),
          drawn,
        },
      )
      if (replaced.isLeft()) return left(EnrollmentRefusal.http(replaced.value, this.i18n))

      await this.enrollments.save(enrollment)
      await this.removals.saveAll(
        this.removalsOf(input, replaced.value.removedStudentIds, students),
      )

      return right(true)
    })
    if (saved.isLeft()) return left(saved.value)

    const board = await this.enrollments.board({
      classroomId: input.classroomId,
      lockAfterDraw: input.lockAfterDraw,
    })
    if (!board)
      return left(
        HTTPException.NotFound(this.i18n.t('classrooms.not_found'), 'CLASSROOM_NOT_FOUND'),
      )

    return right(board)
  }

  /**
   * Each removed athlete becomes a notice to the organization, with the reason. The
   * representative never removes an athlete (the entity refuses), so only the advisor
   * generates a notice.
   */
  private removalsOf(
    input: Replacement,
    removedStudentIds: readonly string[],
    students: ReadonlyArray<{ readonly id: string; readonly name: string }>,
  ): EnrollmentRemoval[] {
    const { writer } = input
    if (writer.role !== 'advisor') return []

    const names = new Map(students.map((student) => [student.id, student.name]))
    const now = new Date()

    return removedStudentIds.map((studentId) =>
      EnrollmentRemoval.record({
        id: randomUUID(),
        classroomId: input.classroomId,
        sportId: input.sportId,
        studentId,
        studentName: names.get(studentId) ?? '',
        reason: writer.reason ?? '',
        actorId: input.actor.id,
        actorRole: input.actor.role,
        now,
      }),
    )
  }
}
