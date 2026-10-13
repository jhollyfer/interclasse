import Student from '#models/student'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { Merge } from '#core/entity'
import type { AdvisorStudentUpdatePayload, IdentifierPayload } from '#core/validator'

type Payload = Merge<AdvisorStudentUpdatePayload, IdentifierPayload>
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
      logger.error({ err: error }, '[advisor students > update][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'STUDENT_UPDATE_ERROR')
      )
    }
  }
}
