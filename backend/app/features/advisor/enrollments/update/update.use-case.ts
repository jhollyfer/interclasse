import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either, type Merge } from '@interclasse/shared'

import Classroom from '#models/classroom'
import type User from '#models/user'
import EnrollmentService, { type EnrollmentBoard } from '#services/enrollment/enrollment.service'
import HTTPException from '#exceptions/http.exception'
import type { EnrollmentUpdatePayload } from '#validators/advisor/enrollments.validator'

type Payload = Merge<EnrollmentUpdatePayload, { actor: User }>
type Response = Either<HTTPException, EnrollmentBoard>

@inject()
export default class AdvisorEnrollmentUpdateUseCase {
  constructor(private readonly enrollments: EnrollmentService) {}

  async execute({ classroomId, sportId, studentIds, reason, actor }: Payload): Promise<Response> {
    try {
      const classroom = await Classroom.find(classroomId)

      if (!classroom)
        return left(HTTPException.NotFound('Turma não encontrada', 'CLASSROOM_NOT_FOUND'))

      const board = await this.enrollments.replace(classroom, sportId, studentIds, {
        role: 'advisor',
        actor,
        reason,
      })
      if (board.isLeft()) return left(board.value)

      return right(board.value)
    } catch (error) {
      logger.error({ err: error }, '[enrollments > update][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADVISOR_ENROLLMENT_UPDATE_ERROR',
        ),
      )
    }
  }
}
