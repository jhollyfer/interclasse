import Classroom from '#models/classroom'
import EnrollmentService, { type EnrollmentBoard } from '#services/enrollment.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { AdvisorEnrollmentShowPayload } from '#core/validator'

type Payload = AdvisorEnrollmentShowPayload
type Response = Either<HTTPException, EnrollmentBoard>

@inject()
export default class AdvisorEnrollmentShowUseCase {
  constructor(private readonly enrollments: EnrollmentService) {}

  async execute({ classroomId }: Payload): Promise<Response> {
    try {
      const classroom = await Classroom.find(classroomId)

      if (!classroom)
        return left(HTTPException.NotFound('Turma não encontrada', 'CLASSROOM_NOT_FOUND'))

      return right(await this.enrollments.board(classroom))
    } catch (error) {
      logger.error({ err: error }, '[advisor enrollments > show][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'ENROLLMENT_SHOW_ERROR')
      )
    }
  }
}
