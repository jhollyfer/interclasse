import type { I18n } from '@adonisjs/i18n'

import { RefusalBase, type RefusalTable } from '#features/_shared.refusal.base'
import HTTPException from '#exceptions/http.exception'
import type { SportError } from '#domain/sport/sport.errors'

/**
 * Cada recusa da modalidade como resposta HTTP (`_standards/domain.md` §2). O
 * 409 do nome repetido é o da checagem antes de gravar e o da corrida no
 * `unique`, que o repository devolve como fato.
 */
export class SportRefusal extends RefusalBase {
  private static readonly TABLE = {
    SPORT_INVALID_LIMITS: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(i18n.t('sports.invalid_limits'), 'SPORT_INVALID_LIMITS', {
        minAthletes: i18n.t('sports.min_above_max'),
      }),
    SPORT_ROSTER_ABOVE_LIMIT: (fact, i18n) =>
      HTTPException.Conflict(i18n.t('sports.roster_above_limit'), 'SPORT_ROSTER_ABOVE_LIMIT', {
        maxAthletes: i18n.t('sports.roster_above_limit_field', { total: fact.largestRoster }),
      }),
    SPORT_ALREADY_EXISTS: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('sports.already_exists'), 'SPORT_ALREADY_EXISTS', {
        name: i18n.t('sports.name_taken'),
      }),
  } satisfies RefusalTable<SportError>

  static http(error: SportError, i18n: I18n): HTTPException {
    return SportRefusal.translate(SportRefusal.TABLE, error.code, error, i18n)
  }
}
