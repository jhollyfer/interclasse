import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Actor,
  type Either,
  type RepresentativeEnrollmentShowResponse,
} from '@interclasse/shared'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { EnrollmentRepository } from '#repositories/enrollment/enrollment.repository'
import HTTPException from '#exceptions/http.exception'

type Payload = { actor: Actor }
type Response = Either<HTTPException, RepresentativeEnrollmentShowResponse>

@inject()
export default class RepresentativeEnrollmentShowUseCase {
  constructor(
    private readonly classrooms: ClassroomRepository,
    private readonly enrollments: EnrollmentRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ actor }: Payload): Promise<Response> {
    try {
      const classroom = await this.classrooms.findOfRepresentative(actor.id)
      if (!classroom)
        return left(
          HTTPException.NotFound(this.i18n.t('classrooms.none_linked'), 'CLASSROOM_NOT_FOUND'),
        )

      const board = await this.enrollments.board({ classroomId: classroom.id, lockAfterDraw: true })
      if (!board)
        return left(
          HTTPException.NotFound(this.i18n.t('classrooms.none_linked'), 'CLASSROOM_NOT_FOUND'),
        )

      return right(board)
    } catch (error) {
      logger.error({ err: error }, '[representative/enrollments > show][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'REPRESENTATIVE_ENROLLMENT_SHOW_ERROR',
        ),
      )
    }
  }
}
