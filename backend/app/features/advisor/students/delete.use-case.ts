import Bracket from '#models/bracket'
import Enrollment from '#models/enrollment'
import Student from '#models/student'
import type User from '#models/user'
import ClassroomPolicy from '#policies/classroom_policy'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { Merge } from '#core/entity'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<IdentifierPayload, { actor: User }>
type Response = Either<HTTPException, Student>

@inject()
export default class AdvisorStudentDeleteUseCase {
  constructor(private readonly policy: ClassroomPolicy) {}

  async execute({ id, actor }: Payload): Promise<Response> {
    try {
      const student = await Student.query().where('id', id).preload('classroom').first()

      if (!student || !this.policy.manage(actor, student.classroom))
        return left(HTTPException.NotFound('Aluno não encontrado', 'STUDENT_NOT_FOUND'))

      const locked = await Enrollment.query()
        .where('studentId', student.id)
        .whereIn(
          'sportId',
          Bracket.query().where('category', student.classroom.category).select('sportId')
        )
        .first()

      if (locked)
        return left(
          HTTPException.Conflict(
            'O aluno está inscrito numa modalidade já sorteada',
            'STUDENT_IN_COMPETITION'
          )
        )

      await student.delete()

      return right(student)
    } catch (error) {
      logger.error({ err: error }, '[advisor students > delete][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'STUDENT_DELETE_ERROR')
      )
    }
  }
}
