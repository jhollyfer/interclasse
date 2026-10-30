import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Actor,
  type AdvisorStudentShowResponse,
  type Either,
  type Merge,
} from '@interclasse/shared'

import { StudentPresenter } from '../students.presenter.ts'
import { StudentRefusal } from '../_shared.student-refusal.ts'

import { StudentRepository } from '#repositories/student/student.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdvisorStudentUpdatePayload } from '#validators/advisor/students.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<AdvisorStudentUpdatePayload, Merge<IdentifierPayload, { actor: Actor }>>
type Response = Either<HTTPException, AdvisorStudentShowResponse>

@inject()
export default class AdvisorStudentUpdateUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id, name, actor }: Payload): Promise<Response> {
    try {
      const student = await this.students.findOwned({ id, actor })
      if (!student)
        return left(HTTPException.NotFound(this.i18n.t('students.not_found'), 'STUDENT_NOT_FOUND'))

      const renamed = student.rename(name, new Date())
      if (renamed.isLeft()) return left(StudentRefusal.http(renamed.value, this.i18n))

      await this.students.save(student)

      return right(StudentPresenter.show(student))
    } catch (error) {
      logger.error({ err: error }, '[advisor/students > update][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADVISOR_STUDENT_UPDATE_ERROR',
        ),
      )
    }
  }
}
