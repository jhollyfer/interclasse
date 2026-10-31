import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import type { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorMatchUpdateResponse,
  type Either,
  type Merge,
} from '@interclasse/shared'

import { MatchRefusal } from '../_shared.match-refusal.ts'

import { BracketRefusal } from '#features/administrator/brackets/_shared.bracket-refusal'
import { BracketRepository } from '#repositories/bracket/bracket.repository'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorMatchUpdatePayload } from '#validators/administrator/matches.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<AdministratorMatchUpdatePayload, IdentifierPayload>
type Response = Either<HTTPException, AdministratorMatchUpdateResponse>

/** Schedules the match: date, time and place. A missing field means "leave alone"; `null` unschedules. */
@inject()
export default class AdministratorMatchUpdateUseCase {
  constructor(
    private readonly brackets: BracketRepository,
    private readonly i18n: I18n,
  ) {}

  /** Missing stays missing and `null` stays `null`: only a real date becomes `Date`. */
  private static dateOf(value: DateTime | null | undefined): Date | null | undefined {
    if (value === undefined) return undefined
    if (value === null) return null

    return value.toJSDate()
  }

  async execute({ id, scheduledAt, location }: Payload): Promise<Response> {
    try {
      const bracket = await this.brackets.findByMatchId(id)
      if (!bracket)
        return left(HTTPException.NotFound(this.i18n.t('matches.not_found'), 'MATCH_NOT_FOUND'))

      const scheduled = bracket.schedule(
        id,
        { scheduledAt: AdministratorMatchUpdateUseCase.dateOf(scheduledAt), location },
        new Date(),
      )
      if (scheduled.isLeft()) return left(MatchRefusal.http(scheduled.value, this.i18n))

      const saved = await this.brackets.save(bracket)
      if (saved.isLeft()) return left(BracketRefusal.http(saved.value, this.i18n))

      const response = await this.brackets.findMatchResponse(id)
      if (!response)
        return left(HTTPException.NotFound(this.i18n.t('matches.not_found'), 'MATCH_NOT_FOUND'))

      return right(response)
    } catch (error) {
      logger.error({ err: error }, '[administrator/matches > update][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_MATCH_UPDATE_ERROR',
        ),
      )
    }
  }
}
