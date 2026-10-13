import Classroom from '#models/classroom'
import Student from '#models/student'
import type User from '#models/user'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { PAGINATION, UserRoles, type Merge, type Paginated } from '#core/entity'
import type { AdvisorStudentPaginationPayload } from '#features/advisor/students/students.validator'
import type { ModelObject } from '@adonisjs/lucid/types/model'

type Payload = Merge<AdvisorStudentPaginationPayload, { actor: User }>
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class AdvisorStudentPaginateUseCase {
  async execute({ actor, ...payload }: Payload): Promise<Response> {
    try {
      const query = Student.query()

      // O recorte de escopo é uma subconsulta, e não uma checagem antes: turma
      // alheia responde lista vazia em vez de confirmar que existe.
      if (actor.role !== UserRoles.ADMINISTRATOR)
        query.whereIn('classroomId', Classroom.query().where('advisorId', actor.id).select('id'))

      if (payload.classroomId) query.where('classroomId', payload.classroomId)
      if (payload.search) query.whereILike('name', `%${payload.search}%`)

      const students = await query
        .orderBy('name', 'asc')
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: students.getMeta(), data: students.all() })
    } catch (error) {
      logger.error({ err: error }, '[advisor students > list][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'STUDENT_LIST_ERROR')
      )
    }
  }
}
