import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Actor,
  type AdvisorEnrollmentShowResponse,
  type Either,
  type Merge,
} from '@interclasse/shared'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { EnrollmentRepository } from '#repositories/enrollment/enrollment.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdvisorEnrollmentShowPayload } from '#validators/advisor/enrollments.validator'

type Payload = Merge<AdvisorEnrollmentShowPayload, { actor: Actor }>
type Response = Either<HTTPException, AdvisorEnrollmentShowResponse>

@inject()
export default class AdvisorEnrollmentShowUseCase {
  constructor(
    private readonly classrooms: ClassroomRepository,
    private readonly enrollments: EnrollmentRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ classroomId, actor }: Payload): Promise<Response> {
    try {
      // `404` também para a turma de outro conselheiro: o alcance entra na consulta.
      const classroom = await this.classrooms.findOwned({ id: classroomId, actor })
      if (!classroom)
        return left(
          HTTPException.NotFound(this.i18n.t('classrooms.not_found'), 'CLASSROOM_NOT_FOUND'),
        )

      const board = await this.enrollments.board({ classroomId, lockAfterDraw: false })
      if (!board)
        return left(
          HTTPException.NotFound(this.i18n.t('classrooms.not_found'), 'CLASSROOM_NOT_FOUND'),
        )

      return right(board)
    } catch (error) {
      logger.error({ err: error }, '[advisor/enrollments > show][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADVISOR_ENROLLMENT_SHOW_ERROR',
        ),
      )
    }
  }
}
