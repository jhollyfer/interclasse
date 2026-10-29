import type { I18n } from '@adonisjs/i18n'

import HTTPException from '#exceptions/http.exception'
import type { MatchError } from '#domain/bracket/bracket.errors'

/**
 * Cada recusa da partida como resposta HTTP, a mesma na agenda, no placar e no
 * desfazer (`_standards/domain.md` §2). `switch` sobre o `code` declarado, e o
 * `never` do fim faz o compilador apontar fato novo sem tradução. Os dois fatos
 * de "a seguinte já foi jogada" falam o mesmo `code` e mensagens diferentes: um
 * manda corrigir a seguinte, o outro desfazê-la.
 */
export class MatchRefusal {
  static http(error: MatchError, i18n: I18n): HTTPException {
    switch (error.code) {
      case 'MATCH_NOT_FOUND':
        return HTTPException.NotFound(i18n.t('matches.not_found'), 'MATCH_NOT_FOUND')
      case 'MATCH_TEAMS_PENDING':
        return HTTPException.Conflict(i18n.t('matches.teams_pending'), 'MATCH_TEAMS_PENDING')
      case 'MATCH_WINNER_REQUIRED':
        return HTTPException.UnprocessableEntity(
          i18n.t('matches.winner_required'),
          'MATCH_WINNER_REQUIRED',
          { winnerTeamId: i18n.t('matches.winner_required_field') },
        )
      case 'MATCH_NOT_PLAYED':
        return HTTPException.Conflict(i18n.t('matches.not_played'), 'MATCH_NOT_PLAYED')
      case 'MATCH_NEXT_PLAYED_ON_SCORE':
        return HTTPException.Conflict(i18n.t('matches.next_played_on_score'), 'NEXT_MATCH_PLAYED')
      case 'MATCH_NEXT_PLAYED_ON_UNSCORE':
        return HTTPException.Conflict(i18n.t('matches.next_played_on_unscore'), 'NEXT_MATCH_PLAYED')
      default:
        return MatchRefusal.unreachable(error)
    }
  }

  private static unreachable(error: never): never {
    throw new Error(`Recusa de partida sem tradução: ${JSON.stringify(error)}`)
  }
}
