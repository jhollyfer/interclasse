import { randomUUID } from 'node:crypto'

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

import { Student } from '#domain/student/student.entity'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { StudentRepository } from '#repositories/student/student.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdvisorStudentCreatePayload } from '#validators/advisor/students.validator'

type Payload = Merge<AdvisorStudentCreatePayload, { actor: Actor }>
type Response = Either<HTTPException, AdvisorStudentShowResponse>

@inject()
export default class AdvisorStudentCreateUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly classrooms: ClassroomRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ actor, ...payload }: Payload): Promise<Response> {
    try {
      // `404` também para a turma de outro conselheiro: dizer `403` confirmaria
      // que ela existe. O alcance entra na consulta (`findOwned`).
      const classroom = await this.classrooms.findOwned({ id: payload.classroomId, actor })
      if (!classroom)
        return left(
          HTTPException.NotFound(this.i18n.t('classrooms.not_found'), 'CLASSROOM_NOT_FOUND'),
        )

      const created = Student.create({ id: randomUUID(), ...payload, now: new Date() })
      if (created.isLeft()) return left(StudentRefusal.http(created.value, this.i18n))

      await this.students.save(created.value)

      return right(StudentPresenter.show(created.value))
    } catch (error) {
      logger.error({ err: error }, '[advisor/students > create][error]')

      return left(
        HTTPException.InternalServerError(this.i18n.t('errors.internal'), 'STUDENT_CREATE_ERROR'),
      )
    }
  }
}
