import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

import MatchCard from '#models/match-card'

export type CardFilters = {
  readonly matchId?: string
  readonly classroomId?: string
  readonly studentId?: string
}

/**
 * Os cartões como as telas os leem: com o atleta, o time e a partida.
 *
 * Service porque é a origem da consulta, e a mesma em dois lugares - o painel
 * (`/administrator/cards`) e a turma do conselheiro (`/advisor/cards`).
 */
export default class CardService {
  list(filters: CardFilters): ModelQueryBuilderContract<typeof MatchCard> {
    const query = MatchCard.query()
      .preload('student')
      .preload('team', (team) => {
        team.preload('classroom')
      })
      .preload('match', (match) => {
        match
          .preload('bracket', (bracket) => {
            bracket.preload('sport')
          })
          .preload('homeTeam', (team) => {
            team.preload('classroom')
          })
          .preload('awayTeam', (team) => {
            team.preload('classroom')
          })
      })

    if (filters.matchId) query.where('matchId', filters.matchId)
    if (filters.studentId) query.where('studentId', filters.studentId)
    if (filters.classroomId)
      query.whereHas('team', (team) => {
        team.where('classroomId', filters.classroomId ?? '')
      })

    return query.orderBy('createdAt', 'desc')
  }
}
