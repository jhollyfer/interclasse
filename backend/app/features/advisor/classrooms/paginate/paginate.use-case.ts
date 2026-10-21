import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'

import Classroom from '#models/classroom'
import type User from '#models/user'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { PAGINATION, USER_ROLE, type Merge } from '#core/entity'
import { type Paginated } from '#core/response'
import type { PaginationPayload } from '#core/validator'

type Payload = Merge<PaginationPayload, { actor: User }>
type Response = Either<HTTPException, Paginated<ModelObject>>

@inject()
export default class AdvisorClassroomPaginateUseCase {
  async execute({ actor, ...payload }: Payload): Promise<Response> {
    try {
      // Quem cuida da turma vem junto: o card mostra o conselheiro e o
      // representante de cada uma.
      const query = Classroom.query().preload('advisor').preload('representative')

      if (actor.role !== USER_ROLE.ADMINISTRATOR) query.where('advisorId', actor.id)
      if (payload.search) query.whereILike('name', `%${payload.search}%`)

      const classrooms = await query
        .orderBy('name', 'asc')
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: classrooms.getMeta(), data: classrooms.all() })
    } catch (error) {
      logger.error({ err: error }, '[classrooms > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ADVISOR_CLASSROOM_PAGINATE_ERROR',
        ),
      )
    }
  }
}
