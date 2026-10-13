import Classroom from '#models/classroom'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { PAGINATION, sortOrder, type Paginated } from '#core/entity'
import type { ClassroomPaginatePayload } from '#features/administrator/classrooms/classrooms.validator'
import type { ModelObject } from '@adonisjs/lucid/types/model'

type Payload = ClassroomPaginatePayload
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class AdministratorClassroomPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const query = Classroom.query().preload('advisor').preload('representative')

      if (payload.category) query.where('category', payload.category)
      if (payload.search) query.whereILike('name', `%${payload.search}%`)

      const classrooms = await query
        .orderBy(...sortOrder(payload, 'name'))
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: classrooms.getMeta(), data: classrooms.all() })
    } catch (error) {
      logger.error({ err: error }, '[classrooms > list][error]')

      return left(
        HTTPException.InternalServerError('Erro interno do servidor', 'CLASSROOM_LIST_ERROR')
      )
    }
  }
}
