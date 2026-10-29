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

import { BracketRepository } from '#repositories/bracket/bracket.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import HTTPException from '#exceptions/http.exception'
import type { AdministratorMatchScorePayload } from '#validators/administrator/matches.validator'
import type { IdentifierPayload } from '#core/validator'

type Payload = Merge<AdministratorMatchScorePayload, IdentifierPayload>
type Response = Either<HTTPException, AdministratorMatchScoreResponse>

/**
 * O placar, e o que ele move: o vencedor avança para a partida seguinte, e a
 * final encerra a chave (regras da entidade). A linha da chave fica travada na
 * unidade de trabalho: dois placares ao mesmo tempo na mesma chave leriam a
 * mesma partida seguinte e um sobrescreveria o outro.
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

        await this.brackets.save(bracket)

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
