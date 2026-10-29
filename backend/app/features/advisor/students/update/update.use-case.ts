import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either, type Merge } from '@interclasse/shared'

import Student from '#models/student'
import HTTPException from '#exceptions/http.exception'
import type { StudentUpdatePayload } from '#validators/advisor/students.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<StudentUpdatePayload, IdentifierPayload>
type Response = Either<HTTPException, Student>

@inject()
export default class AdvisorStudentUpdateUseCase {
  async execute({ id, name }: Payload): Promise<Response> {
    try {
      const student = await Student.query().where('id', id).preload('classroom').first()

      if (!student) return left(HTTPException.NotFound('Aluno não encontrado', 'STUDENT_NOT_FOUND'))

      student.name = name
      await student.save()

      return right(student)
    } catch (error) {
      logger.error({ err: error }, '[students > update][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'STUDENT_UPDATE_ERROR'),
      )
    }
  }
}
