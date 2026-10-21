import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { ModelObject } from '@adonisjs/lucid/types/model'

import EnrollmentRemoval from '#models/enrollment-removal'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { PAGINATION } from '#core/entity'
import { type Paginated } from '#core/response'
import type { EnrollmentRemovalPaginatePayload } from '#features/administrator/enrollment-removals/enrollment-removals.validator'

type Payload = EnrollmentRemovalPaginatePayload
type Response = Either<HTTPException, Paginated<ModelObject>>

/** Os avisos de remoção, do mais novo ao mais antigo, pendentes primeiro. */
@inject()
export default class AdministratorEnrollmentRemovalPaginateUseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      const query = EnrollmentRemoval.query().preload('classroom').preload('sport').preload('actor')

      if (payload.pending === true) query.whereNull('acknowledgedAt')
      if (payload.pending === false) query.whereNotNull('acknowledgedAt')
      if (payload.classroomId) query.where('classroomId', payload.classroomId)

      const removals = await query
        .orderByRaw('acknowledged_at is null desc')
        .orderBy('createdAt', 'desc')
        .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

      return right({ meta: removals.getMeta(), data: removals.all() })
    } catch (error) {
      logger.error({ err: error }, '[enrollment-removals > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ENROLLMENT_REMOVAL_PAGINATE_ERROR',
        ),
      )
    }
  }
}
