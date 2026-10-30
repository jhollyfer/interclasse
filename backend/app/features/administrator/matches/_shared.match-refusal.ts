import type { I18n } from '@adonisjs/i18n'

import { RefusalBase, type RefusalTable } from '#features/_shared.refusal.base'
import HTTPException from '#exceptions/http.exception'
import type { MatchError } from '#domain/bracket/bracket.errors'

/** Cada recusa da partida como resposta HTTP (`_standards/domain.md` §2). */
export class MatchRefusal extends RefusalBase {
  private static readonly TABLE = {
    MATCH_NOT_FOUND: (_fact, i18n) =>
      HTTPException.NotFound(i18n.t('matches.not_found'), 'MATCH_NOT_FOUND'),
    MATCH_TEAMS_PENDING: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('matches.teams_pending'), 'MATCH_TEAMS_PENDING'),
    MATCH_WINNER_REQUIRED: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(
        i18n.t('matches.winner_required'),
        'MATCH_WINNER_REQUIRED',
        { winnerTeamId: i18n.t('matches.winner_required_field') },
      ),
    MATCH_NOT_PLAYED: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('matches.not_played'), 'MATCH_NOT_PLAYED'),
    MATCH_NEXT_PLAYED_ON_SCORE: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('matches.next_played_on_score'), 'NEXT_MATCH_PLAYED'),
    MATCH_NEXT_PLAYED_ON_UNSCORE: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('matches.next_played_on_unscore'), 'NEXT_MATCH_PLAYED'),
  } satisfies RefusalTable<MatchError>

  static http(error: MatchError, i18n: I18n): HTTPException {
    return MatchRefusal.translate(MatchRefusal.TABLE, error.code, error, i18n)
  }
}
