import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  Slug,
  left,
  right,
  type AdministratorSportShowResponse,
  type Either,
  type Merge,
} from '@interclasse/shared'

import { SportPresenter } from '../sports.presenter.ts'
import { SportRefusal } from '../_shared.sport-refusal.ts'

import { SportRepository } from '#repositories/sport/sport.repository'
import HTTPException from '#exceptions/http.exception'
import { isUniqueViolation } from '#features/_shared.database'
import type { IdentifierPayload } from '#core/validator'
import type { AdministratorSportUpdatePayload } from '#validators/administrator/sports.validator'

type Payload = Merge<AdministratorSportUpdatePayload, IdentifierPayload>
type Response = Either<HTTPException, AdministratorSportShowResponse>

/**
 * Renomeia e muda os limites. Campo ausente é "não mexer". O máximo não desce
 * abaixo do maior elenco já inscrito (regra da entidade).
 */
@inject()
export default class AdministratorSportUpdateUseCase {
  constructor(
    private readonly sports: SportRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id, ...changes }: Payload): Promise<Response> {
    try {
      const sport = await this.sports.findById(id)
      if (!sport)
        return left(HTTPException.NotFound(this.i18n.t('sports.not_found'), 'SPORT_NOT_FOUND'))

      if (
        sport.renamesTo(changes.name) &&
        (await this.sports.existsByNameOrSlug(changes.name, Slug.from(changes.name).value, id))
      )
        return left(this.alreadyExists())

      const largestRoster = await this.sports.largestRoster(id)
      const updated = sport.update(changes, { largestRoster, now: new Date() })
      if (updated.isLeft()) return left(SportRefusal.http(updated.value, this.i18n))

      await this.sports.save(sport)

      return right(SportPresenter.show(sport))
    } catch (error) {
      if (isUniqueViolation(error)) return left(this.alreadyExists())

      logger.error({ err: error }, '[administrator/sports > update][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_SPORT_UPDATE_ERROR',
        ),
      )
    }
  }

  private alreadyExists(): HTTPException {
    return HTTPException.Conflict(this.i18n.t('sports.already_exists'), 'SPORT_ALREADY_EXISTS', {
      name: this.i18n.t('sports.name_taken'),
    })
  }
}
