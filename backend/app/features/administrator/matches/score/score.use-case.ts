import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorMatchScoreResponse,
  type Either,
  type Merge,
} from '@interclasse/shared'

import { MatchRefusal } from '../_shared.match-refusal.ts'

import { BracketRefusal } from '#features/administrator/brackets/_shared.bracket-refusal'
import { BracketRepository } from '#repositories/bracket/bracket.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorMatchScorePayload } from '#validators/administrator/matches.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<AdministratorMatchScorePayload, IdentifierPayload>
type Response = Either<HTTPException, AdministratorMatchScoreResponse>

/**
 * The score, and what it moves: the winner advances to the next match, and the
 * final ends the bracket (entity rules). The bracket row stays locked in the
 * unit of work: two scores at the same time on the same bracket would read the
 * same next match and one would overwrite the other.
 */
@inject()
export default class AdministratorMatchScoreUseCase {
  constructor(
    private readonly brackets: BracketRepository,
    private readonly unit: UnitOfWork,
    private readonly i18n: I18n,
  ) {}

  async execute({ id, homeScore, awayScore, winnerTeamId }: Payload): Promise<Response> {
    try {
      const scored = await this.unit.run(async (): Promise<Either<HTTPException, null>> => {
        const bracket = await this.brackets.findByMatchIdForUpdate(id)
        if (!bracket) return left(this.notFound())

        const result = bracket.score(id, { homeScore, awayScore, winnerTeamId }, new Date())
        if (result.isLeft()) return left(MatchRefusal.http(result.value, this.i18n))

        const saved = await this.brackets.save(bracket)
        if (saved.isLeft()) return left(BracketRefusal.http(saved.value, this.i18n))

        return right(null)
      })
      if (scored.isLeft()) return left(scored.value)

      const response = await this.brackets.findMatchResponse(id)
      if (!response) return left(this.notFound())

      return right(response)
    } catch (error) {
      logger.error({ err: error }, '[administrator/matches > score][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_MATCH_SCORE_ERROR',
        ),
      )
    }
  }

  private notFound(): HTTPException {
    return HTTPException.NotFound(this.i18n.t('matches.not_found'), 'MATCH_NOT_FOUND')
  }
}
