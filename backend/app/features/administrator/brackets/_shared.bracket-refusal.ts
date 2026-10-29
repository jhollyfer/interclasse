import type { I18n } from '@adonisjs/i18n'

import HTTPException from '#exceptions/http.exception'
import type { BracketError } from '#domain/bracket/bracket.errors'

/**
 * Cada recusa da chave como resposta HTTP, a mesma no sorteio e no apagar
 * (`_standards/domain.md` §2). `switch` sobre o `code` declarado: o fato que
 * carrega dado chega estreitado, e o `never` do fim faz o compilador apontar
 * fato novo sem tradução.
 */
export class BracketRefusal {
  static http(error: BracketError, i18n: I18n): HTTPException {
    switch (error.code) {
      case 'NOT_ENOUGH_TEAMS':
        return HTTPException.Conflict(
          i18n.t('brackets.not_enough_teams', {
            minTeams: error.minTeams,
            minAthletes: error.minAthletes,
          }),
          'NOT_ENOUGH_TEAMS',
        )
      case 'TOO_MANY_TEAMS':
        return HTTPException.Conflict(
          i18n.t('brackets.too_many_teams', { maxTeams: error.maxTeams }),
          'TOO_MANY_TEAMS',
        )
      case 'BRACKET_HAS_RESULTS':
        return HTTPException.Conflict(i18n.t('brackets.has_results'), 'BRACKET_HAS_RESULTS')
      default:
        return BracketRefusal.unreachable(error)
    }
  }

  private static unreachable(error: never): never {
    throw new Error(`Recusa de chave sem tradução: ${JSON.stringify(error)}`)
  }
}
