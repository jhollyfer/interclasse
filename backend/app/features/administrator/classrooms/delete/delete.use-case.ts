import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import { ClassroomRefusal } from '../_shared.classroom-refusal.ts'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Deletes the classroom for good. No trash: a classroom is an organization registry, redone
 * in seconds, and students and enrollments go along via `CASCADE`. A classroom already in
 * a drawn bracket stays (entity rule).
 */
@inject()
export default class AdministratorClassroomDeleteUseCase {
  constructor(
    private readonly classrooms: ClassroomRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const classroom = await this.classrooms.findById(id)
      if (!classroom)
        return left(
          HTTPException.NotFound(this.i18n.t('classrooms.not_found'), 'CLASSROOM_NOT_FOUND'),
        )

      const removable = classroom.remove({
        inCompetition: await this.classrooms.isInCompetition(id),
      })
      if (removable.isLeft()) return left(ClassroomRefusal.http(removable.value, this.i18n))

      await this.classrooms.delete(classroom)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[administrator/classrooms > delete][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_CLASSROOM_DELETE_ERROR',
        ),
      )
    }
  }
}
