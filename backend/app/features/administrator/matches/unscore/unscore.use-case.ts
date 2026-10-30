import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type AdministratorMatchUnscoreResponse,
  type Either,
} from '@interclasse/shared'

import { MatchRefusal } from '../_shared.match-refusal.ts'

import { BracketRefusal } from '#features/administrator/brackets/_shared.bracket-refusal'
import { BracketRepository } from '#repositories/bracket/bracket.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, AdministratorMatchUnscoreResponse>

/**
 * O caminho de volta do placar: lançado errado, ele sai, e o vencedor sai junto
 * da partida seguinte (regras da entidade). Só desfaz o que ainda não andou. A
 * mesma trava do placar: os dois mexem na partida seguinte.
 */
@inject()
export default class AdministratorMatchUnscoreUseCase {
  constructor(
    private readonly brackets: BracketRepository,
    private readonly unit: UnitOfWork,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const undone = await this.unit.run(async (): Promise<Either<HTTPException, null>> => {
        const bracket = await this.brackets.findByMatchIdForUpdate(id)
        if (!bracket) return left(this.notFound())

        const result = bracket.unscore(id, new Date())
        if (result.isLeft()) return left(MatchRefusal.http(result.value, this.i18n))

        const saved = await this.brackets.save(bracket)
        if (saved.isLeft()) return left(BracketRefusal.http(saved.value, this.i18n))

        return right(null)
      })
      if (undone.isLeft()) return left(undone.value)

      const response = await this.brackets.findMatchResponse(id)
      if (!response) return left(this.notFound())

      return right(response)
    } catch (error) {
      logger.error({ err: error }, '[administrator/matches > unscore][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_MATCH_UNSCORE_ERROR',
        ),
      )
    }
  }

  private notFound(): HTTPException {
    return HTTPException.NotFound(this.i18n.t('matches.not_found'), 'MATCH_NOT_FOUND')
  }
}
