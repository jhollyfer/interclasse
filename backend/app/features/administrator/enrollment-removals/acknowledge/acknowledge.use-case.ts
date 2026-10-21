import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

import EnrollmentRemoval from '#models/enrollment-removal'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, EnrollmentRemoval>

/**
 * A ciência do administrador. Idempotente: dar ciência de novo mantém a data
 * da primeira.
 */
@inject()
export default class AdministratorEnrollmentRemovalAcknowledgeUseCase {
  async execute({ id }: Payload): Promise<Response> {
    try {
      const removal = await EnrollmentRemoval.find(id)

      if (!removal)
        return left(
          HTTPException.NotFound('Aviso de remoção não encontrado', 'ENROLLMENT_REMOVAL_NOT_FOUND'),
        )

      if (!removal.acknowledgedAt) {
        removal.acknowledgedAt = DateTime.now()
        await removal.save()
      }

      await removal.load('classroom')
      await removal.load('sport')
      await removal.load('actor')

      return right(removal)
    } catch (error) {
      logger.error({ err: error }, '[enrollment-removals > acknowledge][error]')

      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'ENROLLMENT_REMOVAL_ACKNOWLEDGE_ERROR',
        ),
      )
    }
  }
}
