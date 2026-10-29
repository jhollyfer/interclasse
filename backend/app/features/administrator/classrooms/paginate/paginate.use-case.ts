import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'
import { PAGINATION, left, right, type Either, type Paginated } from '@interclasse/shared'

import Classroom from '#models/classroom'
import HTTPException from '#exceptions/http.exception'
import { sortOrder } from '#features/_shared.sort'
import type { ClassroomPaginatePayload } from '#validators/administrator/classrooms.validator'

type Payload = ClassroomPaginatePayload
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class AdministratorClassroomPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      // Os totais do cartão da turma, contados no banco sem carregar alunos nem
      // inscrições (_doc-lib/lucid.md#relationships, `withCount`/`withAggregate`).
      const query = Classroom.query()
        .preload('advisor')
        .preload('representative')
        .withCount('students')
        .withAggregate('enrollments', (enrollments) => {
          enrollments.countDistinct('enrollments.student_id').as('athletes_count')
        })
        .withAggregate('enrollments', (enrollments) => {
          enrollments.countDistinct('enrollments.sport_id').as('sports_count')
        })

      if (payload.category) query.where('category', payload.category)
      if (payload.search) query.whereILike('name', `%${payload.search}%`)

      const classrooms = await query
        .orderBy(...sortOrder(payload, 'name'))
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({
        meta: classrooms.getMeta(),
        data: classrooms.all().map((classroom) => ({
          ...classroom.serialize(),
          studentsCount: Number(classroom.$extras.students_count),
          athletesCount: Number(classroom.$extras.athletes_count),
          sportsCount: Number(classroom.$extras.sports_count),
        })),
      })
    } catch (error) {
      logger.error({ err: error }, '[classrooms > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADMINISTRATOR_CLASSROOM_PAGINATE_ERROR',
        ),
      )
    }
  }
}
