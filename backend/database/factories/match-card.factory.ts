import factory from '@adonisjs/lucid/factories'

import MatchCard from '#models/match-card'

/**
 * Cartão de uma partida. `matchId`, `teamId` e `studentId` vêm sempre do teste
 * (`merge`), porque o cartão só existe preso a uma partida, um time e um aluno.
 */
export const MatchCardFactory = factory
  .define(MatchCard, () => ({ color: 'YELLOW' as const }))
  .build()
