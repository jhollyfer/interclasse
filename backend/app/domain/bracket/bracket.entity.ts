import {
  BRACKET_STATUS,
  MATCH_PHASE,
  MATCH_STATUS,
  left,
  right,
  type BracketStatus,
  type Category,
  type Either,
  type MatchPhase,
  type MatchStatus,
} from '@interclasse/shared'

import type { BracketError, MatchError } from './bracket.errors.ts'

import { Knockout, type Pairing, type Random } from '#domain/shared/knockout.value-object'

/** O time é a turma dentro da competição. */
export type TeamProps = {
  readonly id: string
  readonly classroomId: string
  readonly createdAt: Date
  updatedAt: Date | null
}

/** A partida da chave: só muda pela raiz (`Bracket`), e não tem repository próprio. */
export type MatchProps = {
  readonly id: string
  readonly phase: MatchPhase
  readonly round: number
  readonly position: number
  status: MatchStatus
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number | null
  awayScore: number | null
  winnerTeamId: string | null
  scheduledAt: Date | null
  location: string | null
  readonly createdAt: Date
  updatedAt: Date | null
}

export type BracketProps = {
  readonly id: string
  readonly sportId: string
  readonly category: Category
  status: BracketStatus
  readonly createdAt: Date
  updatedAt: Date | null
  readonly teams: TeamProps[]
  readonly matches: MatchProps[]
}

/** Quem joga a partida: os dois times e, se perguntado, o time de uma turma. */
export type Lineup = {
  readonly homeTeamId: string | null
  readonly awayTeamId: string | null
  readonly classroomTeamId: string | null
}

type DrawInput = {
  readonly id: string
  readonly sportId: string
  readonly category: Category
  /** O mínimo de atletas da modalidade: só entra no fato, quando faltam turmas. */
  readonly minAthletes: number
  /** As turmas da categoria com inscritos suficientes para formar time. */
  readonly classroomIds: ReadonlyArray<string>
  readonly newId: () => string
  readonly random: Random
  readonly now: Date
}

type ScoreInput = {
  readonly homeScore: number
  readonly awayScore: number
  readonly winnerTeamId?: string
}

type ScheduleChanges = {
  readonly scheduledAt?: Date | null
  readonly location?: string | null
}

/**
 * A competição de uma modalidade numa categoria: o agregado com os times e as
 * partidas (`_standards/domain.md` §4). Guarda o sorteio, o avanço do vencedor
 * pela chave e o encerramento com campeã; time e partida só mudam por aqui.
 */
export class Bracket {
  private constructor(private readonly props: BracketProps) {}

  /**
   * O sorteio: monta a chave de mata-mata inteira, da primeira fase à final. O
   * id, o relógio e o sorteio chegam de fora: o domínio não faz I/O.
   */
  static draw(input: DrawInput): Either<BracketError, Bracket> {
    if (input.classroomIds.length < Knockout.MIN_TEAMS)
      return left({
        code: 'NOT_ENOUGH_TEAMS',
        minTeams: Knockout.MIN_TEAMS,
        minAthletes: input.minAthletes,
      })

    if (input.classroomIds.length > Knockout.MAX_TEAMS)
      return left({ code: 'TOO_MANY_TEAMS', maxTeams: Knockout.MAX_TEAMS })

    const pairings = Knockout.pair(input.classroomIds, input.random)
    const teams = Bracket.teamsOf(pairings, input)

    return right(
      new Bracket({
        id: input.id,
        sportId: input.sportId,
        category: input.category,
        status: BRACKET_STATUS.KNOCKOUT,
        createdAt: input.now,
        // Nasce com a edição carimbada, como a linha do banco nasce.
        updatedAt: input.now,
        teams,
        matches: Bracket.matchesOf(pairings, teams, input),
      }),
    )
  }

  /** Reidratação pelo repository: o dado passou pelas invariantes ao ser gravado. */
  static restore(props: BracketProps): Bracket {
    return new Bracket(structuredClone(props))
  }

  /**
   * Só sai a chave sem resultado: com placar lançado, apagar levaria embora o
   * que aconteceu em quadra, sem volta.
   */
  ensureDeletable(): Either<BracketError, Bracket> {
    if (this.props.matches.some((match) => match.status === MATCH_STATUS.FINISHED))
      return left({ code: 'BRACKET_HAS_RESULTS' })

    return right(this)
  }

  /** Data, hora e local. Ausente é "não mexer"; `null` desmarca. */
  schedule(matchId: string, changes: ScheduleChanges, now: Date): Either<MatchError, Bracket> {
    const match = this.matchOf(matchId)
    if (!match) return left({ code: 'MATCH_NOT_FOUND' })

    if (changes.scheduledAt !== undefined) match.scheduledAt = changes.scheduledAt
    if (changes.location !== undefined) match.location = changes.location
    match.updatedAt = now

    return right(this)
  }

  /**
   * O placar, e o que ele move: o vencedor avança para a partida seguinte, e a
   * final encerra a chave. Empate só com o vencedor dos pênaltis.
   */
  score(matchId: string, input: ScoreInput, now: Date): Either<MatchError, Bracket> {
    const match = this.matchOf(matchId)
    if (!match) return left({ code: 'MATCH_NOT_FOUND' })

    if (!match.homeTeamId || !match.awayTeamId) return left({ code: 'MATCH_TEAMS_PENDING' })

    const winner = Bracket.winnerOf(match, input)
    if (!winner) return left({ code: 'MATCH_WINNER_REQUIRED' })

    const next = this.nextOf(match)
    // Trocar o vencedor depois que ele já jogou a próxima reescreveria um
    // resultado que aconteceu em quadra.
    if (
      next &&
      next.status === MATCH_STATUS.FINISHED &&
      match.winnerTeamId !== null &&
      match.winnerTeamId !== winner
    )
      return left({ code: 'MATCH_NEXT_PLAYED_ON_SCORE' })

    match.homeScore = input.homeScore
    match.awayScore = input.awayScore
    match.winnerTeamId = winner
    match.status = MATCH_STATUS.FINISHED
    match.updatedAt = now

    if (next) {
      const { side } = Knockout.advanceSlot(match.position)
      if (side === 'home') next.homeTeamId = winner
      if (side === 'away') next.awayTeamId = winner
      next.updatedAt = now
    }

    if (match.phase === MATCH_PHASE.FINAL) {
      this.props.status = BRACKET_STATUS.FINISHED
      this.props.updatedAt = now
    }

    return right(this)
  }

  /**
   * O caminho de volta do placar: lançado errado, ele sai, e o vencedor sai
   * junto da partida seguinte. Só desfaz o que ainda não andou.
   */
  unscore(matchId: string, now: Date): Either<MatchError, Bracket> {
    const match = this.matchOf(matchId)
    if (!match) return left({ code: 'MATCH_NOT_FOUND' })

    if (match.status !== MATCH_STATUS.FINISHED) return left({ code: 'MATCH_NOT_PLAYED' })

    const next = this.nextOf(match)
    if (next && next.status === MATCH_STATUS.FINISHED)
      return left({ code: 'MATCH_NEXT_PLAYED_ON_UNSCORE' })

    if (next) {
      const { side } = Knockout.advanceSlot(match.position)
      if (side === 'home' && next.homeTeamId === match.winnerTeamId) next.homeTeamId = null
      if (side === 'away' && next.awayTeamId === match.winnerTeamId) next.awayTeamId = null
      next.updatedAt = now
    }

    match.homeScore = null
    match.awayScore = null
    match.winnerTeamId = null
    match.status = MATCH_STATUS.SCHEDULED
    match.updatedAt = now

    // Sem final jogada, não há campeã: a chave volta a estar em disputa.
    if (this.props.status === BRACKET_STATUS.FINISHED) {
      this.props.status = BRACKET_STATUS.KNOCKOUT
      this.props.updatedAt = now
    }

    return right(this)
  }

  /**
   * Os dois times da partida e, entre eles, o da turma dada: de onde o cartão
   * tira o time do atleta. `null` se a partida não é desta chave.
   */
  lineupOf(matchId: string, classroomId: string | null): Lineup | null {
    const match = this.matchOf(matchId)
    if (!match) return null

    const playing = this.props.teams.filter(
      (team) => team.id === match.homeTeamId || team.id === match.awayTeamId,
    )

    return {
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      classroomTeamId: playing.find((team) => team.classroomId === classroomId)?.id ?? null,
    }
  }

  /** A campeã de uma chave terminada: a vencedora da final. */
  champion(): string | null {
    if (this.props.status !== BRACKET_STATUS.FINISHED) return null

    const final = this.props.matches.find((match) => match.phase === MATCH_PHASE.FINAL)

    return final?.winnerTeamId ?? null
  }

  get id(): string {
    return this.props.id
  }

  get sportId(): string {
    return this.props.sportId
  }

  snapshot(): Readonly<BracketProps> {
    return structuredClone(this.props)
  }

  private matchOf(matchId: string): MatchProps | undefined {
    return this.props.matches.find((match) => match.id === matchId)
  }

  /** A partida onde o vencedor entra: a posição `position / 2` da fase seguinte. */
  private nextOf(match: MatchProps): MatchProps | undefined {
    const phase = Knockout.nextPhase(match.phase)
    if (!phase) return undefined

    const { position } = Knockout.advanceSlot(match.position)

    return this.props.matches.find((other) => other.phase === phase && other.position === position)
  }

  /** Placar decide; empate só com o vencedor dos pênaltis, e ele tem que ser um dos dois. */
  private static winnerOf(match: MatchProps, input: ScoreInput): string | null {
    if (input.homeScore > input.awayScore) return match.homeTeamId
    if (input.awayScore > input.homeScore) return match.awayTeamId
    if (input.winnerTeamId === match.homeTeamId || input.winnerTeamId === match.awayTeamId)
      return input.winnerTeamId ?? null

    return null
  }

  private static teamsOf(pairings: ReadonlyArray<Pairing<string>>, input: DrawInput): TeamProps[] {
    const classroomIds = pairings.flatMap((pairing) => {
      if (pairing.away) return [pairing.home, pairing.away]

      return [pairing.home]
    })

    return classroomIds.map((classroomId) => ({
      id: input.newId(),
      classroomId,
      createdAt: input.now,
      updatedAt: input.now,
    }))
  }

  /**
   * As partidas da chave inteira. As fases seguintes nascem vazias e vão sendo
   * preenchidas pelos vencedores; o time de folga já entra na fase seguinte, no
   * lugar onde o vencedor do confronto dele entraria.
   */
  private static matchesOf(
    pairings: ReadonlyArray<Pairing<string>>,
    teams: ReadonlyArray<TeamProps>,
    input: DrawInput,
  ): MatchProps[] {
    const teamOf = new Map(teams.map((team) => [team.classroomId, team.id]))
    const matches: MatchProps[] = []
    const advanced = new Map<number, { home?: string; away?: string }>()
    let phase = Knockout.phaseOf(Knockout.sizeFor(teams.length))
    let round = 1
    let size = pairings.length

    // Primeira fase: só os confrontos de verdade; a folga sobe direto.
    for (const [position, pairing] of pairings.entries()) {
      const home = teamOf.get(pairing.home) ?? null

      if (!pairing.away) {
        const slot = Knockout.advanceSlot(position)
        advanced.set(slot.position, {
          ...advanced.get(slot.position),
          [slot.side]: home ?? undefined,
        })
        continue
      }

      matches.push(
        Bracket.emptyMatch(input, {
          phase: phase ?? MATCH_PHASE.FINAL,
          round,
          position,
          homeTeamId: home,
          awayTeamId: teamOf.get(pairing.away) ?? null,
        }),
      )
    }

    phase = phase && Knockout.nextPhase(phase)
    size /= 2

    while (phase) {
      round += 1
      for (let position = 0; position < size; position++) {
        const filled = advanced.get(position)
        matches.push(
          Bracket.emptyMatch(input, {
            phase,
            round,
            position,
            homeTeamId: filled?.home ?? null,
            awayTeamId: filled?.away ?? null,
          }),
        )
      }

      advanced.clear()
      phase = Knockout.nextPhase(phase)
      size /= 2
    }

    return matches
  }

  private static emptyMatch(
    input: DrawInput,
    place: Pick<MatchProps, 'phase' | 'round' | 'position' | 'homeTeamId' | 'awayTeamId'>,
  ): MatchProps {
    return {
      id: input.newId(),
      ...place,
      status: MATCH_STATUS.SCHEDULED,
      homeScore: null,
      awayScore: null,
      winnerTeamId: null,
      scheduledAt: null,
      location: null,
      createdAt: input.now,
      updatedAt: input.now,
    }
  }
}
