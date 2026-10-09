import Classroom from '#models/classroom'
import type User from '#models/user'
import ClassroomPolicy from '#policies/classroom_policy'
import EnrollmentService, { type EnrollmentBoard } from '#services/enrollment.service'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { Merge } from '#core/entity'
import type { AdvisorEnrollmentShowPayload } from '#core/validator'

type Payload = Merge<AdvisorEnrollmentShowPayload, { actor: User }>
type Response = Either<HTTPException, EnrollmentBoard>

@inject()
export default class AdvisorEnrollmentShowUseCase {
  constructor(
    private readonly policy: ClassroomPolicy,
    private readonly enrollments: EnrollmentService
  ) {}

  async execute({ classroomId, actor }: Payload): Promise<Response> {
    try {
      const classroom = await Classroom.find(classroomId)

      if (!classroom || !this.policy.manage(actor, classroom))
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
