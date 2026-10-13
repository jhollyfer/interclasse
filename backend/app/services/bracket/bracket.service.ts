import Bracket from '#models/bracket'
import type Match from '#models/match'
import { BRACKET_STATUS, MATCH_PHASE, type BracketStatus, type Category } from '#core/entity'

export type BracketDetail = {
  id: string
  category: Category
  status: BracketStatus
  sport: { id: string; name: string; slug: string }
  championTeamId: string | null
  matches: Array<{
    id: string
    phase: string
    round: number
    position: number
    status: string
    homeTeamId: string | null
    awayTeamId: string | null
    homeName: string | null
    awayName: string | null
    homeScore: number | null
    awayScore: number | null
    winnerTeamId: string | null
    scheduledAt: string | null
    location: string | null
  }>
}

/**
 * A chave como ela é lida: as partidas de cada fase, com os nomes das turmas.
 *
 * Service porque monta a consulta e é a mesma leitura em dois lugares - o
 * painel (`/administrator/brackets/:id`) e o site (`/storefront/brackets/:id`).
 */
export default class BracketService {
  async detail(id: string): Promise<BracketDetail | null> {
    const bracket = await Bracket.query()
      .where('id', id)
      .preload('sport')
      .preload('teams', (teams) => {
        teams.preload('classroom')
      })
      .preload('matches', (matches) => {
        matches.orderBy('round', 'asc').orderBy('position', 'asc')
      })
      .first()

    if (!bracket) return null

    const names = new Map(bracket.teams.map((team) => [team.id, team.classroom.name]))

    return {
      id: bracket.id,
      category: bracket.category,
      status: bracket.status,
      sport: { id: bracket.sport.id, name: bracket.sport.name, slug: bracket.sport.slug },
      championTeamId: this.champion(bracket),
      matches: bracket.matches.map((match) => this.shape(match, names)),
    }
  }

  /** O campeão de uma chave terminada: o vencedor da final. */
  private champion(bracket: Bracket): string | null {
    if (bracket.status !== BRACKET_STATUS.FINISHED) return null

    const final = bracket.matches.find((match) => match.phase === MATCH_PHASE.FINAL)

    return final?.winnerTeamId ?? null
  }

  private shape(match: Match, names: Map<string, string>): BracketDetail['matches'][number] {
    return {
      id: match.id,
      phase: match.phase,
      round: match.round,
      position: match.position,
      status: match.status,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeName: this.nameOf(names, match.homeTeamId),
      awayName: this.nameOf(names, match.awayTeamId),
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      winnerTeamId: match.winnerTeamId,
      scheduledAt: match.scheduledAt?.toISO() ?? null,
      location: match.location,
    }
  }

  private nameOf(names: Map<string, string>, teamId: string | null): string | null {
    if (teamId === null) return null

    return names.get(teamId) ?? null
  }
}
