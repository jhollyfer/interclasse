import factory from '@adonisjs/lucid/factories'
import { MATCH_PHASE, MATCH_STATUS } from '@interclasse/shared'

import Match from '#models/match'
import { BracketFactory } from '#database/factories/bracket.factory'

/** Schedulable match, with no teams or score: the shape the draw creates. */
export const MatchFactory = factory
  .define(Match, () => ({
    phase: MATCH_PHASE.FINAL,
    round: 1,
    position: 1,
    status: MATCH_STATUS.SCHEDULED,
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    scheduledAt: null,
    location: null,
  }))
  .relation('bracket', () => BracketFactory)
  .build()
