import Classroom from '#models/classroom'
import Student from '#models/student'
import type User from '#models/user'
import ClassroomPolicy from '#policies/classroom_policy'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { Merge } from '#core/entity'
import type { AdvisorStudentCreatePayload } from '#core/validator'

type Payload = Merge<AdvisorStudentCreatePayload, { actor: User }>
type Response = Either<HTTPException, Student>

@inject()
export default class AdvisorStudentCreateUseCase {
  constructor(private readonly policy: ClassroomPolicy) {}

  async execute({ actor, ...payload }: Payload): Promise<Response> {
    try {
      const classroom = await Classroom.find(payload.classroomId)

      // `404` também para a turma de outro conselheiro: dizer `403` confirmaria
      // que ela existe.
      if (!classroom || !this.policy.manage(actor, classroom))
        return left(HTTPException.NotFound('Turma não encontrada', 'CLASSROOM_NOT_FOUND'))

      const student = await Student.create(payload)

      return right(student)
    } catch (error) {
      logger.error({ err: error }, '[advisor students > create][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'STUDENT_CREATE_ERROR')
      )
    }
  }
}
