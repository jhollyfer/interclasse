import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorMatchAthletesResponse,
  type Either,
} from '@interclasse/shared'

import { BracketRepository } from '#repositories/bracket/bracket.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, AdministratorMatchAthletesResponse>

/**
 * Quem pode levar cartão na partida: os alunos das duas turmas, os inscritos na
 * modalidade primeiro.
 */
@inject()
export default class AdministratorMatchAthletesUseCase {
  constructor(
    private readonly brackets: BracketRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const athletes = await this.brackets.matchAthletes(id)
      if (!athletes)
        return left(HTTPException.NotFound(this.i18n.t('matches.not_found'), 'MATCH_NOT_FOUND'))

      return right(athletes)
    } catch (error) {
      logger.error({ err: error }, '[administrator/matches > athletes][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_MATCH_ATHLETES_ERROR',
        ),
      )
    }
  }
}
