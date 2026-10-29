import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'
import {
  PAGINATION,
  USER_ROLE,
  left,
  right,
  type Either,
  type Merge,
  type Paginated,
} from '@interclasse/shared'

import Classroom from '#models/classroom'
import Student from '#models/student'
import type User from '#models/user'
import HTTPException from '#exceptions/http.exception'
import type { StudentPaginatePayload } from '#features/advisor/students/students.validator'

type Payload = Merge<StudentPaginatePayload, { actor: User }>
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class AdvisorStudentPaginateUseCase {
  async execute({ actor, ...payload }: Payload): Promise<Response> {
    try {
      const query = Student.query()

      // O recorte de escopo é uma subconsulta, e não uma checagem antes: turma
      // alheia responde lista vazia em vez de confirmar que existe.
      if (actor.role !== USER_ROLE.ADMINISTRATOR)
        query.whereIn('classroomId', Classroom.query().where('advisorId', actor.id).select('id'))

      if (payload.classroomId) query.where('classroomId', payload.classroomId)
      if (payload.search) query.whereILike('name', `%${payload.search}%`)

      const students = await query
        .orderBy('name', 'asc')
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: students.getMeta(), data: students.all() })
    } catch (error) {
      logger.error({ err: error }, '[students > paginate][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'STUDENT_PAGINATE_ERROR'),
      )
    }
  }
}
