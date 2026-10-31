import factory from '@adonisjs/lucid/factories'

import MatchCard from '#models/match-card'

/**
 * Card of a match. `matchId`, `teamId` and `studentId` always come from the test
 * (`merge`), because the card only exists tied to a match, a team and a student.
 */
export const MatchCardFactory = factory
  .define(MatchCard, () => ({ color: 'YELLOW' as const }))
  .build()
