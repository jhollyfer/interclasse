import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type Actor,
  type AdvisorClassroomShowResponse,
  type Either,
  type Merge,
  type Paginated,
} from '@interclasse/shared'

import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdvisorClassroomPaginatePayload } from '#validators/advisor/classrooms.validator'

type Payload = Merge<AdvisorClassroomPaginatePayload, { actor: Actor }>
type Response = Either<HTTPException, Paginated<AdvisorClassroomShowResponse>>

/** The classrooms within reach of whoever acts: the administrator sees all, the advisor their own. */
@inject()
export default class AdvisorClassroomPaginateUseCase {
  constructor(
    private readonly classrooms: ClassroomRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ actor, ...payload }: Payload): Promise<Response> {
    try {
      return right(
        await this.classrooms.paginateOwned({
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
          search: payload.search,
          actor,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[advisor/classrooms > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADVISOR_CLASSROOM_PAGINATE_ERROR',
        ),
      )
    }
  }
}
