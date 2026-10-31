import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  type Actor,
  type AdvisorEnrollmentShowResponse,
  type Either,
  type Merge,
} from '@interclasse/shared'

import { EnrollmentReplaceBase } from '#features/_shared.enrollment-replace.base'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { EnrollmentRemovalRepository } from '#repositories/enrollment-removal/enrollment-removal.repository'
import { EnrollmentRepository } from '#repositories/enrollment/enrollment.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import HTTPException from '#exceptions/http.exception'
import type { AdvisorEnrollmentUpdatePayload } from '#validators/advisor/enrollments.validator'

type Payload = Merge<AdvisorEnrollmentUpdatePayload, { actor: Actor }>
type Response = Either<HTTPException, AdvisorEnrollmentShowResponse>

/**
 * Replaces the classroom athlete list in a sport. The advisor can touch it at
 * any moment, including after the draw; removing an athlete requires the reason,
 * which becomes a notice for the organization. The flow is the one of the base shared with the
 * representative.
 */
@inject()
export default class AdvisorEnrollmentUpdateUseCase extends EnrollmentReplaceBase {
  constructor(
    private readonly classrooms: ClassroomRepository,
    enrollments: EnrollmentRepository,
    removals: EnrollmentRemovalRepository,
    unit: UnitOfWork,
    i18n: I18n,
  ) {
    super(enrollments, removals, unit, i18n)
  }

  async execute({ classroomId, sportId, studentIds, reason, actor }: Payload): Promise<Response> {
    try {
      // `404` also for another advisor's classroom: the scope goes into the query.
      const classroom = await this.classrooms.findOwned({ id: classroomId, actor })
      if (!classroom)
        return left(
          HTTPException.NotFound(this.i18n.t('classrooms.not_found'), 'CLASSROOM_NOT_FOUND'),
        )

      return await this.replace({
        classroomId,
        sportId,
        studentIds,
        writer: { role: 'advisor', reason },
        actor,
        lockAfterDraw: false,
      })
    } catch (error) {
      logger.error({ err: error }, '[advisor/enrollments > update][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADVISOR_ENROLLMENT_UPDATE_ERROR',
        ),
      )
    }
  }
}
