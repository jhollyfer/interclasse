import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  type Actor,
  type Either,
  type Merge,
  type RepresentativeEnrollmentShowResponse,
} from '@interclasse/shared'

import { EnrollmentReplaceBase } from '#features/_shared.enrollment-replace.base'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { EnrollmentRemovalRepository } from '#repositories/enrollment-removal/enrollment-removal.repository'
import { EnrollmentRepository } from '#repositories/enrollment/enrollment.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import HTTPException from '#exceptions/http.exception'
import type { RepresentativeEnrollmentUpdatePayload } from '#validators/representative/enrollments.validator'

type Payload = Merge<RepresentativeEnrollmentUpdatePayload, { actor: Actor }>
type Response = Either<HTTPException, RepresentativeEnrollmentShowResponse>

/**
 * O representante só acrescenta atletas à lista da própria turma, e só antes do
 * sorteio (regras da entidade). A turma sai da sessão. O fluxo é o da base
 * compartilhada com o conselheiro.
 */
@inject()
export default class RepresentativeEnrollmentUpdateUseCase extends EnrollmentReplaceBase {
  constructor(
    private readonly classrooms: ClassroomRepository,
    enrollments: EnrollmentRepository,
    removals: EnrollmentRemovalRepository,
    unit: UnitOfWork,
    i18n: I18n,
  ) {
    super(enrollments, removals, unit, i18n)
  }

  async execute({ sportId, studentIds, actor }: Payload): Promise<Response> {
    try {
      const classroom = await this.classrooms.findOfRepresentative(actor.id)
      if (!classroom)
        return left(
          HTTPException.NotFound(this.i18n.t('classrooms.none_linked'), 'CLASSROOM_NOT_FOUND'),
        )

      return await this.replace({
        classroomId: classroom.id,
        sportId,
        studentIds,
        writer: { role: 'representative' },
        actor,
        lockAfterDraw: true,
      })
    } catch (error) {
      logger.error({ err: error }, '[representative/enrollments > update][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'REPRESENTATIVE_ENROLLMENT_UPDATE_ERROR',
        ),
      )
    }
  }
}
