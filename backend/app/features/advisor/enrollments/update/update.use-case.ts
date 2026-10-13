import Classroom from '#models/classroom'
import EnrollmentService, { type EnrollmentBoard } from '#services/enrollment/enrollment.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { EnrollmentUpdatePayload } from '#features/advisor/enrollments/enrollments.validator'

type Payload = EnrollmentUpdatePayload
type Response = Either<HTTPException, EnrollmentBoard>

@inject()
export default class AdvisorEnrollmentUpdateUseCase {
  constructor(private readonly enrollments: EnrollmentService) {}

  async execute({ classroomId, sportId, studentIds }: Payload): Promise<Response> {
    try {
      const classroom = await Classroom.find(classroomId)

      if (!classroom)
        return left(HTTPException.NotFound('Turma não encontrada', 'CLASSROOM_NOT_FOUND'))

      const board = await this.enrollments.replace(classroom, sportId, studentIds, {
        canRemove: true,
      })
      if (board.isLeft()) return left(board.value)

      return right(board.value)
    } catch (error) {
      logger.error({ err: error }, '[advisor enrollments > update][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'ENROLLMENT_UPDATE_ERROR')
      )
    }
  }
}
