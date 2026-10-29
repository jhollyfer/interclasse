import type {
  AdministratorBracketPaginateResponse,
  AdministratorBracketPreviewResponse,
  AdministratorBracketShowResponse,
  AdministratorMatchAthletesResponse,
  AdministratorMatchPaginateResponse,
  AdministratorMatchUpdateResponse,
  AdministratorSportShowResponse,
  BracketStatus,
  Category,
  MatchPhase,
  MatchStatus,
  Paginated,
} from '@interclasse/shared'

import type { Bracket } from '#domain/bracket/bracket.entity'

/** A ordem da lista de chaves: a mais nova primeiro (painel) ou por modalidade (abas do site). */
export type BracketListOrder = 'newest' | 'sport-name'

export type BracketListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly sportId?: string
  readonly category?: Category
  readonly status?: BracketStatus
  readonly order: BracketListOrder
}

/**
 * A ordem da tabela de jogos: a agenda (marcadas por horário, depois as sem
 * horário por rodada) ou, nos resultados do site, o mais recente primeiro.
 */
export type MatchListOrder = 'schedule' | 'recent-results'

export type MatchListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly bracketId?: string
  readonly classroomId?: string
  readonly sportId?: string
  readonly category?: Category
  readonly phase?: MatchPhase
  readonly status?: MatchStatus
  readonly order: MatchListOrder
}

/**
 * A persistência da chave, por intenção (`_standards/domain.md` §5.1). O
 * escritor único de `brackets`, `teams` e `matches`: time e partida só mudam
 * pela raiz, então não têm repository próprio. Lê modalidades, turmas, alunos e
 * inscrições só para responder o que o sorteio e as telas perguntam.
 */
export abstract class BracketRepository {
  abstract findById(id: string): Promise<Bracket | null>
  /** A chave dona da partida. */
  abstract findByMatchId(matchId: string): Promise<Bracket | null>
  /**
   * A chave dona da partida, com a linha travada até o fim da unidade de
   * trabalho: dois placares ao mesmo tempo na mesma chave leriam a mesma partida
   * seguinte e um sobrescreveria o outro. Só vale dentro de `UnitOfWork.run`.
   */
  abstract findByMatchIdForUpdate(matchId: string): Promise<Bracket | null>
  abstract findBySportAndCategory(sportId: string, category: Category): Promise<Bracket | null>
  abstract findSport(sportId: string): Promise<AdministratorSportShowResponse | null>
  /**
   * A modalidade, com a linha travada até o fim da unidade de trabalho: a
   * inscrição trava a mesma linha antes de gravar, e sem isso uma lista salva no
   * meio do sorteio ficaria fora de uma chave que já fechou as inscrições. Só
   * vale dentro de `UnitOfWork.run`.
   */
  abstract lockSport(sportId: string): Promise<AdministratorSportShowResponse | null>
  /** As turmas da categoria com ao menos `minAthletes` inscritos na modalidade. */
  abstract eligibleClassroomIds(
    sportId: string,
    category: Category,
    minAthletes: number,
  ): Promise<string[]>
  /** O nome de cada turma, pelo id. */
  abstract classroomNames(classroomIds: ReadonlyArray<string>): Promise<Map<string, string>>
  /** Grava a chave inteira: nova, em lote; existente, só o que mudou. */
  abstract save(bracket: Bracket): Promise<void>
  /** Times e partidas vão junto. */
  abstract delete(bracket: Bracket): Promise<void>

  /** Leitura leve: a prévia do sorteio, ou `null` se a modalidade não existe. */
  abstract preview(
    sportId: string,
    category: Category,
  ): Promise<AdministratorBracketPreviewResponse | null>
  abstract paginate(
    criteria: BracketListCriteria,
  ): Promise<Paginated<AdministratorBracketPaginateResponse>>
  abstract paginateMatches(
    criteria: MatchListCriteria,
  ): Promise<Paginated<AdministratorMatchPaginateResponse>>
  /** A partida com os dois times, as turmas inteiras e a chave com a modalidade. */
  abstract findMatchResponse(matchId: string): Promise<AdministratorMatchUpdateResponse | null>
  /** Os alunos das duas turmas da partida, os inscritos na modalidade primeiro. */
  abstract matchAthletes(matchId: string): Promise<AdministratorMatchAthletesResponse | null>

  /**
   * A chave inteira como a tela a desenha: as partidas de cada fase com o nome
   * das turmas. Composta do que as duas implementações já sabem ler, para a
   * forma da resposta existir uma vez só.
   */
  async detail(id: string): Promise<AdministratorBracketShowResponse | null> {
    const bracket = await this.findById(id)
    if (!bracket) return null

    const snapshot = bracket.snapshot()
    const sport = await this.findSport(snapshot.sportId)
    if (!sport) return null

    const names = await this.classroomNames(snapshot.teams.map((team) => team.classroomId))
    const classroomOf = new Map(snapshot.teams.map((team) => [team.id, team.classroomId]))
    const nameOf = (teamId: string | null): string | null => {
      if (teamId === null) return null
      const classroomId = classroomOf.get(teamId)
      if (classroomId === undefined) return null

      return names.get(classroomId) ?? null
    }

    return {
      id: snapshot.id,
      category: snapshot.category,
      status: snapshot.status,
      sport: { id: sport.id, name: sport.name, slug: sport.slug },
      championTeamId: bracket.champion(),
      matches: [...snapshot.matches]
        .sort((a, b) => a.round - b.round || a.position - b.position)
        .map((match) => ({
          id: match.id,
          phase: match.phase,
          round: match.round,
          position: match.position,
          status: match.status,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeName: nameOf(match.homeTeamId),
          awayName: nameOf(match.awayTeamId),
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          winnerTeamId: match.winnerTeamId,
          scheduledAt: match.scheduledAt?.toISOString() ?? null,
          location: match.location,
        })),
    }
  }
}
