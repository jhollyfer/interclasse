import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import { BracketRefusal } from '../_shared.bracket-refusal.ts'

import { BracketRepository } from '#repositories/bracket/bracket.repository'
import HTTPException from '#exceptions/http.exception'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Teams and matches go along.
 *
 * Only a bracket without results goes (entity rule): with a recorded score, deleting
 * would take away what happened on the court, with no way back. To redo an already
 * played bracket, the scores are undone first (`DELETE /administrator/matches/:id/score`).
 */
@inject()
export default class AdministratorBracketDeleteUseCase {
  constructor(
    private readonly brackets: BracketRepository,
    private readonly i18n: I18n,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const bracket = await this.brackets.findById(id)
      if (!bracket)
        return left(HTTPException.NotFound(this.i18n.t('brackets.not_found'), 'BRACKET_NOT_FOUND'))

      const deletable = bracket.ensureDeletable()
      if (deletable.isLeft()) return left(BracketRefusal.http(deletable.value, this.i18n))

      await this.brackets.delete(bracket)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[administrator/brackets > delete][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'ADMINISTRATOR_BRACKET_DELETE_ERROR',
        ),
      )
    }
  }
}
