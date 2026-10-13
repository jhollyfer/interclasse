import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

import Classroom from '#models/classroom'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, Classroom>

@inject()
export default class AdministratorClassroomShowUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const classroom = await Classroom.query()
        .where('id', id)
        .preload('advisor')
        .preload('representative')
        .first()

      if (!classroom)
        return left(HTTPException.NotFound('Turma não encontrada', 'CLASSROOM_NOT_FOUND'))

      return right(classroom)
    } catch (error) {
      logger.error({ err: error }, '[classrooms > show][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_CLASSROOM_SHOW_ERROR',
        ),
      )
    }
  }
}
