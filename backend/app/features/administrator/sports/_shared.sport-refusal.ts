import type { I18n } from '@adonisjs/i18n'

import HTTPException from '#exceptions/http.exception'
import type { SportError } from '#domain/sport/sport.errors'

/**
 * Cada recusa da modalidade como resposta HTTP, a mesma no cadastro e na edição
 * (`_standards/domain.md` §2). `switch` sobre o `code` declarado: o fato que
 * carrega dado (`largestRoster`) chega estreitado, e o `never` do fim faz o
 * compilador apontar fato novo sem tradução.
 */
export class SportRefusal {
  static http(error: SportError, i18n: I18n): HTTPException {
    switch (error.code) {
      case 'SPORT_INVALID_LIMITS':
        return HTTPException.UnprocessableEntity(
          i18n.t('sports.invalid_limits'),
          'SPORT_INVALID_LIMITS',
          { minAthletes: i18n.t('sports.min_above_max') },
        )
      case 'SPORT_ROSTER_ABOVE_LIMIT':
        return HTTPException.Conflict(
          i18n.t('sports.roster_above_limit'),
          'SPORT_ROSTER_ABOVE_LIMIT',
          {
            maxAthletes: i18n.t('sports.roster_above_limit_field', { total: error.largestRoster }),
          },
        )
      default:
        return SportRefusal.unreachable(error)
    }
  }

  private static unreachable(error: never): never {
    throw new Error(`Recusa de modalidade sem tradução: ${JSON.stringify(error)}`)
  }
}
