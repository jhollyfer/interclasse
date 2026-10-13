import Classroom from '#models/classroom'
import Student from '#models/student'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { AdvisorStudentCreatePayload } from '#features/advisor/students/students.validator'

type Payload = AdvisorStudentCreatePayload
type Response = Either<HTTPException, Student>

@inject()
export default class AdvisorStudentCreateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const classroom = await Classroom.find(payload.classroomId)

      // `404` também para a turma de outro conselheiro: dizer `403` confirmaria
      // que ela existe.
      if (!classroom)
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
