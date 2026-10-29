import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  SORT_DIRECTION,
  left,
  right,
  type AdministratorClassroomPaginateResponse,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorClassroomPaginatePayload } from '#validators/administrator/classrooms.validator'

type Payload = AdministratorClassroomPaginatePayload
type Response = Either<HTTPException, Paginated<AdministratorClassroomPaginateResponse>>

@inject()
export default class AdministratorClassroomPaginateUseCase {
  constructor(
    private readonly classrooms: ClassroomRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      return right(
        await this.classrooms.paginate({
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
          search: payload.search,
          category: payload.category,
          sort: payload.sort ?? 'name',
          direction: payload.direction ?? SORT_DIRECTION.ASC,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[administrator/classrooms > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_CLASSROOM_PAGINATE_ERROR',
        ),
      )
    }
  }
}
