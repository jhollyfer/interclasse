import { randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type AdministratorSportShowResponse, type Either } from '@interclasse/shared'

import { SportPresenter } from '../sports.presenter.ts'
import { SportRefusal } from '../_shared.sport-refusal.ts'

import { Sport } from '#domain/sport/sport.entity'
import { SportRepository } from '#repositories/sport/sport.repository'
import HTTPException from '#exceptions/http.exception'
import { isUniqueViolation } from '#features/_shared.database'
import type { AdministratorSportCreatePayload } from '#validators/administrator/sports.validator'

type Payload = AdministratorSportCreatePayload
type Response = Either<HTTPException, AdministratorSportShowResponse>

/** Cadastra a modalidade: a entidade confere os limites, o repository a unicidade. */
@inject()
export default class AdministratorSportCreateUseCase {
  constructor(
    private readonly sports: SportRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const created = Sport.create({ id: randomUUID(), ...payload, now: new Date() })
      if (created.isLeft()) return left(SportRefusal.http(created.value, this.i18n))

      const sport = created.value
      if (await this.sports.existsByNameOrSlug(payload.name, sport.snapshot().slug))
        return left(this.alreadyExists())

      await this.sports.save(sport)

      return right(SportPresenter.show(sport))
    } catch (error) {
      // A checagem acima não fecha a corrida: o segundo de dois pedidos
      // simultâneos esbarra no `unique` do banco.
      if (isUniqueViolation(error)) return left(this.alreadyExists())

      logger.error({ err: error }, '[administrator/sports > create][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_SPORT_CREATE_ERROR',
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
