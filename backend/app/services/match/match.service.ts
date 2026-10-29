import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { type Category, type MatchPhase, type MatchStatus } from '@interclasse/shared'

import type Classroom from '#models/classroom'
import Match from '#models/match'

export type MatchFilters = {
  readonly bracketId?: string
  readonly classroomId?: string
  readonly sportId?: string
  readonly category?: Category
  readonly phase?: MatchPhase
  readonly status?: MatchStatus
}

/**
 * A tabela de jogos, a mesma no painel e no site.
 *
 * Service porque é a origem da consulta, e não um filtro sobre uma recebida
 * (_standards/backend.md §4.9): os dois lados pedem o mesmo recorte e a mesma
 * ordem, e duas cópias divergiriam na primeira coluna nova.
 */
export default class MatchService {
  /**
   * Só o que a tabela de jogos mostra. Sem o `select`, a lista pública levava o
   * `advisorId` e o `representativeId` de cada turma - ids de conta que o site
   * anônimo não tem por que conhecer.
   */
  private static publicClassroom(query: ModelQueryBuilderContract<typeof Classroom>) {
    query.select('id', 'name', 'category')
  }

  /**
   * Partidas com os dois times definidos, na ordem em que acontecem: as
   * marcadas por horário, depois as sem horário por rodada.
   *
   * Partida de mata-mata ainda sem adversário fica de fora - na tabela de jogos
   * ela seria uma linha "a definir x a definir".
   */
  schedule(filters: MatchFilters): ModelQueryBuilderContract<typeof Match> {
    const query = Match.query()
      .whereNotNull('homeTeamId')
      .whereNotNull('awayTeamId')
      .preload('homeTeam', (team) => {
        team.preload('classroom', MatchService.publicClassroom)
      })
      .preload('awayTeam', (team) => {
        team.preload('classroom', MatchService.publicClassroom)
      })
      .preload('bracket', (bracket) => {
        bracket.preload('sport')
      })

    if (filters.bracketId) query.where('bracketId', filters.bracketId)
    if (filters.phase) query.where('phase', filters.phase)
    if (filters.classroomId) {
      const classroomId = filters.classroomId
      query.where((sides) => {
        sides
          .whereHas('homeTeam', (team) => {
            team.where('classroomId', classroomId)
          })
          .orWhereHas('awayTeam', (team) => {
            team.where('classroomId', classroomId)
          })
      })
    }
    if (filters.status) query.where('status', filters.status)

    if (filters.sportId || filters.category) {
      query.whereHas('bracket', (bracket) => {
        if (filters.sportId) bracket.where('sportId', filters.sportId)
        if (filters.category) bracket.where('category', filters.category)
      })
    }

    return query
      .orderByRaw('scheduled_at asc nulls last')
      .orderBy('round', 'asc')
      .orderBy('position', 'asc')
  }
}
