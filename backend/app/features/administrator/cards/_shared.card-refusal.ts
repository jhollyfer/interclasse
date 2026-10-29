import type { I18n } from '@adonisjs/i18n'

import HTTPException from '#exceptions/http.exception'
import type { MatchCardError } from '#domain/match-card/match-card.errors'

/**
 * Cada recusa do cartão como resposta HTTP (`_standards/domain.md` §2). `switch`
 * sobre o `code` declarado, e o `never` do fim faz o compilador apontar fato
 * novo sem tradução.
 */
export class CardRefusal {
  static http(error: MatchCardError, i18n: I18n): HTTPException {
    switch (error.code) {
      case 'MATCH_TEAMS_PENDING':
        return HTTPException.Conflict(i18n.t('cards.teams_pending'), 'MATCH_TEAMS_PENDING')
      case 'STUDENT_NOT_IN_MATCH':
        return HTTPException.UnprocessableEntity(
          i18n.t('cards.student_not_in_match'),
          'STUDENT_NOT_IN_MATCH',
          { studentId: i18n.t('cards.student_not_in_match_field') },
        )
      default:
        return CardRefusal.unreachable(error)
    }
  }

  private static unreachable(error: never): never {
    throw new Error(`Recusa de cartão sem tradução: ${JSON.stringify(error)}`)
  }
}
