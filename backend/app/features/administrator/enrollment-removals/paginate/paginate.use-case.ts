import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  PAGINATION,
  left,
  right,
  type AdministratorEnrollmentRemovalShowResponse,
  type Either,
  type Paginated,
} from '@interclasse/shared'

import { EnrollmentRemovalRepository } from '#repositories/enrollment-removal/enrollment-removal.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorEnrollmentRemovalPaginatePayload } from '#validators/administrator/enrollment-removals.validator'

type Payload = AdministratorEnrollmentRemovalPaginatePayload
type Response = Either<HTTPException, Paginated<AdministratorEnrollmentRemovalShowResponse>>

/** Os avisos de remoção, do mais novo ao mais antigo, pendentes primeiro. */
@inject()
export default class AdministratorEnrollmentRemovalPaginateUseCase {
  constructor(
    private readonly removals: EnrollmentRemovalRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      return right(
        await this.removals.paginate({
          page: payload.page ?? PAGINATION.PAGE,
          perPage: payload.perPage ?? PAGINATION.PER_PAGE,
          pending: payload.pending,
          classroomId: payload.classroomId,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[administrator/enrollment-removals > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ENROLLMENT_REMOVAL_PAGINATE_ERROR',
        ),
      )
    }
  }
}
