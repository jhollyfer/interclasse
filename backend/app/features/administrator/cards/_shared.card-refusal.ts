import type { I18n } from '@adonisjs/i18n'

import { RefusalBase, type RefusalTable } from '#features/_shared.refusal.base'
import HTTPException from '#exceptions/http.exception'
import type { MatchCardError } from '#domain/match-card/match-card.errors'

/** Cada recusa do cartão como resposta HTTP (`_standards/domain.md` §2). */
export class CardRefusal extends RefusalBase {
  private static readonly TABLE = {
    MATCH_TEAMS_PENDING: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('cards.teams_pending'), 'MATCH_TEAMS_PENDING'),
    STUDENT_NOT_IN_MATCH: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(
        i18n.t('cards.student_not_in_match'),
        'STUDENT_NOT_IN_MATCH',
        { studentId: i18n.t('cards.student_not_in_match_field') },
      ),
  } satisfies RefusalTable<MatchCardError>

  static http(error: MatchCardError, i18n: I18n): HTTPException {
    return CardRefusal.translate(CardRefusal.TABLE, error.code, error, i18n)
  }
}
