import Classroom from '#models/classroom'
import Match from '#models/match'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { Category, MatchPhase, MatchStatus } from '#core/entity'

export type MatchFilters = {
  bracketId?: string
  sportId?: string
  category?: Category
  phase?: MatchPhase
  status?: MatchStatus
}

/**
 * A tabela de jogos, a mesma no painel e no site.
 *
 * Service porque é a origem da consulta, e não um filtro sobre uma recebida
 * (PADRAO-BACKEND.md, seção 4.9): os dois lados pedem o mesmo recorte e a mesma
 * ordem, e duas cópias divergiriam na primeira coluna nova.
 */
/**
 * Só o que a tabela de jogos mostra. Sem o `select`, a lista pública levava o
 * `advisorId` e o `representativeId` de cada turma - ids de conta que o site
 * anônimo não tem por que conhecer.
 */
function publicClassroom(query: ModelQueryBuilderContract<typeof Classroom>) {
  query.select('id', 'name', 'category')
}

export default class MatchService {
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
      .preload('homeTeam', (team) => team.preload('classroom', publicClassroom))
      .preload('awayTeam', (team) => team.preload('classroom', publicClassroom))
      .preload('bracket', (bracket) => bracket.preload('sport'))

    if (filters.bracketId) query.where('bracketId', filters.bracketId)
    if (filters.phase) query.where('phase', filters.phase)
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
