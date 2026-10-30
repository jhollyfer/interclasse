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
 * A ciência do administrador. Idempotente: dar ciência de novo mantém a data da
 * primeira (a entidade devolve o fato `ENROLLMENT_REMOVAL_ALREADY_ACKNOWLEDGED`,
 * que aqui é sucesso sem gravar).
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
