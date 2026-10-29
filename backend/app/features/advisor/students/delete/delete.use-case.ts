import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Actor, type Either, type Merge } from '@interclasse/shared'

import { StudentRefusal } from '../_shared.student-refusal.ts'

import { StudentRepository } from '#repositories/student/student.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<IdentifierPayload, { actor: Actor }>
type Response = Either<HTTPException, null>

/**
 * Tira o aluno da turma, com as inscrições dele. Inscrito numa modalidade já
 * sorteada fica: o time sorteado perderia um atleta (regra da entidade).
 */
@inject()
export default class AdvisorStudentDeleteUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id, actor }: Payload): Promise<Response> {
    try {
      const student = await this.students.findOwned({ id, actor })
      if (!student)
        return left(HTTPException.NotFound(this.i18n.t('students.not_found'), 'STUDENT_NOT_FOUND'))

      const removable = student.remove({ inDrawnSport: await this.students.isInDrawnSport(id) })
      if (removable.isLeft()) return left(StudentRefusal.http(removable.value, this.i18n))

      await this.students.delete(student)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[advisor/students > delete][error]')

      return left(
        HTTPException.InternalServerError(this.i18n.t('errors.internal'), 'STUDENT_DELETE_ERROR'),
      )
    }
  }
}
