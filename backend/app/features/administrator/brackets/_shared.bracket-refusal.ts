import type { I18n } from '@adonisjs/i18n'

import { RefusalBase, type RefusalTable } from '#features/_shared.refusal.base'
import HTTPException from '#exceptions/http.exception'
import type { BracketError } from '#domain/bracket/bracket.errors'

/**
 * Cada recusa da chave como resposta HTTP, a mesma no sorteio e no apagar
 * (`_standards/domain.md` §2). Tabela por `code`: o fato que carrega dado chega
 * estreitado, e fato novo sem entrada não compila.
 */
export class BracketRefusal extends RefusalBase {
  private static readonly TABLE = {
    NOT_ENOUGH_TEAMS: (fact, i18n) =>
      HTTPException.Conflict(
        i18n.t('brackets.not_enough_teams', {
          minTeams: fact.minTeams,
          minAthletes: fact.minAthletes,
        }),
        'NOT_ENOUGH_TEAMS',
      ),
    TOO_MANY_TEAMS: (fact, i18n) =>
      HTTPException.Conflict(
        i18n.t('brackets.too_many_teams', { maxTeams: fact.maxTeams }),
        'TOO_MANY_TEAMS',
      ),
    BRACKET_HAS_RESULTS: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('brackets.has_results'), 'BRACKET_HAS_RESULTS'),
    BRACKET_ALREADY_EXISTS: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('brackets.already_exists'), 'BRACKET_ALREADY_EXISTS'),
  } satisfies RefusalTable<BracketError>

  static http(error: BracketError, i18n: I18n): HTTPException {
    return BracketRefusal.translate(BracketRefusal.TABLE, error.code, error, i18n)
  }
}
