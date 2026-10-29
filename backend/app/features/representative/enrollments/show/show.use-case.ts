import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import Classroom from '#models/classroom'
import type User from '#models/user'
import EnrollmentService, { type EnrollmentBoard } from '#services/enrollment/enrollment.service'
import HTTPException from '#exceptions/http.exception'

type Payload = { actor: User }
type Response = Either<HTTPException, EnrollmentBoard>

@inject()
export default class RepresentativeEnrollmentShowUseCase {
  constructor(private readonly enrollments: EnrollmentService) {}

  async execute({ actor }: Payload): Promise<Response> {
    try {
      const classroom = await Classroom.findBy('representativeId', actor.id)

      if (!classroom)
        return left(HTTPException.NotFound('Nenhuma turma vinculada', 'CLASSROOM_NOT_FOUND'))

      return right(await this.enrollments.board(classroom, { lockAfterDraw: true }))
    } catch (error) {
      logger.error({ err: error }, '[enrollments > show][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'REPRESENTATIVE_ENROLLMENT_SHOW_ERROR',
        ),
      )
    }
  }
}
