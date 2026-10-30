import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorClassroomShowResponse,
  type Either,
} from '@interclasse/shared'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, AdministratorClassroomShowResponse>

@inject()
export default class AdministratorClassroomShowUseCase {
  constructor(
    private readonly classrooms: ClassroomRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const classroom = await this.classrooms.findDetail(id)
      if (!classroom)
        return left(
          HTTPException.NotFound(this.i18n.t('classrooms.not_found'), 'CLASSROOM_NOT_FOUND'),
        )

      return right(classroom)
    } catch (error) {
      logger.error({ err: error }, '[administrator/classrooms > show][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_CLASSROOM_SHOW_ERROR',
        ),
      )
    }
  }
}
