import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type AdministratorSportShowResponse, type Either } from '@interclasse/shared'

import { SportPresenter } from '../sports.presenter.ts'

import { SportRepository } from '#repositories/sport/sport.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, AdministratorSportShowResponse>

/** Deletes the sport without enrollment or bracket: both would be left without a sport. */
@inject()
export default class AdministratorSportDeleteUseCase {
  constructor(
    private readonly sports: SportRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const sport = await this.sports.findById(id)
      if (!sport)
        return left(HTTPException.NotFound(this.i18n.t('sports.not_found'), 'SPORT_NOT_FOUND'))

      if (await this.sports.isInUse(id))
        return left(HTTPException.Conflict(this.i18n.t('sports.in_use'), 'SPORT_IN_USE'))

      await this.sports.delete(sport)

      return right(SportPresenter.show(sport))
    } catch (error) {
      logger.error({ err: error }, '[administrator/sports > delete][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_SPORT_DELETE_ERROR',
        ),
      )
    }
  }
}
