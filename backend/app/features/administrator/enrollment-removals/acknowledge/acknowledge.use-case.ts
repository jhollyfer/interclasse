import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorEnrollmentRemovalShowResponse,
  type Either,
} from '@interclasse/shared'

import { EnrollmentRemovalRepository } from '#repositories/enrollment-removal/enrollment-removal.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, AdministratorEnrollmentRemovalShowResponse>

/**
 * The administrator acknowledgement. Idempotent: acknowledging again keeps the date of the
 * first (the entity returns the fact `ENROLLMENT_REMOVAL_ALREADY_ACKNOWLEDGED`,
 * which here is success without saving).
 */
@inject()
export default class AdministratorEnrollmentRemovalAcknowledgeUseCase {
  constructor(
    private readonly removals: EnrollmentRemovalRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const removal = await this.removals.findById(id)
      if (!removal)
        return left(
          HTTPException.NotFound(
            this.i18n.t('enrollment_removals.not_found'),
            'ENROLLMENT_REMOVAL_NOT_FOUND',
          ),
        )

      if (removal.acknowledge(new Date()).isRight()) await this.removals.save(removal)

      const detail = await this.removals.findDetail(id)
      if (!detail)
        return left(
          HTTPException.NotFound(
            this.i18n.t('enrollment_removals.not_found'),
            'ENROLLMENT_REMOVAL_NOT_FOUND',
          ),
        )

      return right(detail)
    } catch (error) {
      logger.error({ err: error }, '[administrator/enrollment-removals > acknowledge][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_ENROLLMENT_REMOVAL_ACKNOWLEDGE_ERROR',
        ),
      )
    }
  }
}
