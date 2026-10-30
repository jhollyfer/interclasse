import { left, right } from '@interclasse/shared'
import type {
  AdministratorBracketPaginateResponse,
  AdministratorBracketPreviewResponse,
  AdministratorMatchAthletesResponse,
  AdministratorMatchPaginateResponse,
  AdministratorMatchTeamResponse,
  AdministratorMatchUpdateResponse,
  AdministratorSportShowResponse,
  Category,
  Either,
  Paginated,
} from '@interclasse/shared'

import {
  BracketRepository,
  type BracketListCriteria,
  type MatchListCriteria,
} from './bracket.repository.ts'

import { Bracket, type BracketProps, type MatchProps } from '#domain/bracket/bracket.entity'
import type { BracketError } from '#domain/bracket/bracket.errors'
import { Knockout } from '#domain/shared/knockout.value-object'
import { MemoryPagination } from '#core/memory-pagination'

/** A turma como o teste a arranja: o que a chave lê dela. */
export type ClassroomView = {
  readonly id: string
  readonly name: string
  readonly grade: number
  readonly category: Category
  readonly advisorId: string | null
  readonly representativeId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date | null
}

export type StudentView = {
  readonly id: string
  readonly name: string
  readonly classroomId: string
}

/**
 * A segunda implementação de verdade, para o teste unitário do use-case
 * (`_standards/domain.md` §5.3). Guarda cópias: o teste não altera o "banco"
 * por referência. As modalidades, turmas, alunos e inscrições que a chave só
 * lê são arranjadas pelo teste.
 */
export class BracketMemoryRepository extends BracketRepository {
  private readonly rows = new Map<string, BracketProps>()
  private readonly sports = new Map<string, AdministratorSportShowResponse>()
  private readonly classrooms = new Map<string, ClassroomView>()
  private readonly students = new Map<string, StudentView>()
  /** Quem está inscrito em qual modalidade: `sportId` -> ids dos alunos. */
  private readonly enrollments = new Map<string, Set<string>>()

  /** Arranjo do teste: uma modalidade existente. */
  withSport(sport: AdministratorSportShowResponse): this {
    this.sports.set(sport.id, sport)
    return this
  }

  /** Arranjo do teste: uma turma existente. */
  withClassroom(classroom: ClassroomView): this {
    this.classrooms.set(classroom.id, classroom)
    return this
  }

  /** Arranjo do teste: um aluno da turma, inscrito ou não nas modalidades. */
  withStudent(student: StudentView, enrolledIn: ReadonlyArray<string> = []): this {
    this.students.set(student.id, student)
    for (const sportId of enrolledIn) {
      const enrolled = this.enrollments.get(sportId) ?? new Set<string>()
      enrolled.add(student.id)
      this.enrollments.set(sportId, enrolled)
    }
    return this
  }

  async findById(id: string): Promise<Bracket | null> {
    const props = this.rows.get(id)
    if (!props) return null

    return Bracket.restore(structuredClone(props))
  }

  async findByMatchId(matchId: string): Promise<Bracket | null> {
    const props = this.ownerOf(matchId)
    if (!props) return null

    return Bracket.restore(structuredClone(props))
  }

  async findByMatchIdForUpdate(matchId: string): Promise<Bracket | null> {
    return this.findByMatchId(matchId)
  }

  async findBySportAndCategory(sportId: string, category: Category): Promise<Bracket | null> {
    const props = [...this.rows.values()].find(
      (row) => row.sportId === sportId && row.category === category,
    )
    if (!props) return null

    return Bracket.restore(structuredClone(props))
  }

  async findSport(sportId: string): Promise<AdministratorSportShowResponse | null> {
    return this.sports.get(sportId) ?? null
  }

  async lockSport(sportId: string): Promise<AdministratorSportShowResponse | null> {
    return this.findSport(sportId)
  }

  async eligibleClassroomIds(
    sportId: string,
    category: Category,
    minAthletes: number,
  ): Promise<string[]> {
    return [...this.classrooms.values()]
      .filter((classroom) => classroom.category === category)
      .filter((classroom) => this.athletesOf(classroom.id, sportId) >= minAthletes)
      .map((classroom) => classroom.id)
      .filter((id) => this.athletesOf(id, sportId) > 0)
  }

  async classroomNames(classroomIds: ReadonlyArray<string>): Promise<Map<string, string>> {
    const names = new Map<string, string>()
    for (const id of classroomIds) {
      const classroom = this.classrooms.get(id)
      if (classroom) names.set(id, classroom.name)
    }

    return names
  }

  async save(bracket: Bracket): Promise<Either<BracketError, void>> {
    const snapshot = structuredClone(bracket.snapshot())
    const taken = [...this.rows.values()].some(
      (row) =>
        row.id !== snapshot.id &&
        row.sportId === snapshot.sportId &&
        row.category === snapshot.category,
    )
    // O `unique` de modalidade e categoria, como o banco o garante.
    if (taken) return left({ code: 'BRACKET_ALREADY_EXISTS' })

    this.rows.set(snapshot.id, snapshot)

    return right(undefined)
  }

  async delete(bracket: Bracket): Promise<void> {
    this.rows.delete(bracket.id)
  }

  async preview(
    sportId: string,
    category: Category,
  ): Promise<AdministratorBracketPreviewResponse | null> {
    const sport = this.sports.get(sportId)
    if (!sport) return null

    const classrooms = [...this.classrooms.values()]
      .filter((classroom) => classroom.category === category)
      .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name))

    return {
      minAthletes: sport.minAthletes,
      maxTeams: Knockout.MAX_TEAMS,
      drawn: (await this.findBySportAndCategory(sportId, category)) !== null,
      classrooms: classrooms.map((classroom) => {
        const athletes = this.athletesOf(classroom.id, sportId)

        return {
          id: classroom.id,
          name: classroom.name,
          athletes,
          eligible: athletes >= sport.minAthletes,
        }
      }),
    }
  }

  async paginate(
    criteria: BracketListCriteria,
  ): Promise<Paginated<AdministratorBracketPaginateResponse>> {
    const items = [...this.rows.values()]
      .filter((row) => !criteria.sportId || row.sportId === criteria.sportId)
      .filter((row) => !criteria.category || row.category === criteria.category)
      .filter((row) => !criteria.status || row.status === criteria.status)
      .sort((a, b) => this.compareBrackets(a, b, criteria))
      .flatMap((row) => this.toListItems(row))

    return MemoryPagination.slice(items, criteria.page, criteria.perPage)
  }

  async paginateMatches(
    criteria: MatchListCriteria,
  ): Promise<Paginated<AdministratorMatchPaginateResponse>> {
    const items = [...this.rows.values()]
      .filter((row) => !criteria.bracketId || row.id === criteria.bracketId)
      .filter((row) => !criteria.sportId || row.sportId === criteria.sportId)
      .filter((row) => !criteria.category || row.category === criteria.category)
      .flatMap((row) => row.matches.map((match) => ({ bracket: row, match })))
      .filter(({ match }) => match.homeTeamId !== null && match.awayTeamId !== null)
      .filter(({ match }) => !criteria.phase || match.phase === criteria.phase)
      .filter(({ match }) => !criteria.status || match.status === criteria.status)
      .filter(
        ({ bracket, match }) =>
          !criteria.classroomId ||
          this.classroomOfTeam(bracket, match.homeTeamId) === criteria.classroomId ||
          this.classroomOfTeam(bracket, match.awayTeamId) === criteria.classroomId,
      )
      .sort((a, b) => this.compareMatches(a.match, b.match, criteria))
      .flatMap(({ bracket, match }) => this.toPaginateItems(bracket, match))

    return MemoryPagination.slice(items, criteria.page, criteria.perPage)
  }

  async findMatchResponses(
    matchIds: ReadonlyArray<string>,
  ): Promise<Map<string, AdministratorMatchUpdateResponse>> {
    const responses = new Map<string, AdministratorMatchUpdateResponse>()

    for (const matchId of matchIds) {
      const bracket = this.ownerOf(matchId)
      const match = bracket?.matches.find((candidate) => candidate.id === matchId)
      const sport = bracket && this.sports.get(bracket.sportId)
      if (!bracket || !match || !sport) continue

      responses.set(matchId, {
        ...this.matchFields(match, bracket.id),
        homeTeam: this.fullTeam(bracket, match.homeTeamId),
        awayTeam: this.fullTeam(bracket, match.awayTeamId),
        bracket: this.listItem(bracket, sport),
      })
    }

    return responses
  }

  async matchAthletes(matchId: string): Promise<AdministratorMatchAthletesResponse | null> {
    const bracket = this.ownerOf(matchId)
    const match = bracket?.matches.find((candidate) => candidate.id === matchId)
    if (!bracket || !match) return null

    const enrolled = this.enrollments.get(bracket.sportId) ?? new Set<string>()
    const teams = [match.homeTeamId, match.awayTeamId]
      .map((teamId) => bracket.teams.find((team) => team.id === teamId))
      .filter((team) => team !== undefined)

    return {
      teams: teams.map((team) => ({
        teamId: team.id,
        classroomId: team.classroomId,
        name: this.classrooms.get(team.classroomId)?.name ?? '',
        students: [...this.students.values()]
          .filter((student) => student.classroomId === team.classroomId)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((student) => ({
            id: student.id,
            name: student.name,
            enrolled: enrolled.has(student.id),
          }))
          .sort((a, b) => Number(b.enrolled) - Number(a.enrolled)),
      })),
    }
  }

  private ownerOf(matchId: string): BracketProps | undefined {
    return [...this.rows.values()].find((row) => row.matches.some((match) => match.id === matchId))
  }

  private athletesOf(classroomId: string, sportId: string): number {
    const enrolled = this.enrollments.get(sportId) ?? new Set<string>()

    return [...this.students.values()].filter(
      (student) => student.classroomId === classroomId && enrolled.has(student.id),
    ).length
  }

  private classroomOfTeam(bracket: BracketProps, teamId: string | null): string | undefined {
    return bracket.teams.find((team) => team.id === teamId)?.classroomId
  }

  private compareBrackets(a: BracketProps, b: BracketProps, criteria: BracketListCriteria): number {
    if (criteria.order === 'newest') return b.createdAt.getTime() - a.createdAt.getTime()

    const nameOf = (row: BracketProps): string => this.sports.get(row.sportId)?.name ?? ''

    return nameOf(a).localeCompare(nameOf(b)) || a.category.localeCompare(b.category)
  }

  /** As marcadas por horário (as sem horário por último), depois a rodada e a posição. */
  private compareMatches(a: MatchProps, b: MatchProps, criteria: MatchListCriteria): number {
    if (criteria.order === 'recent-results')
      return (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0)

    const never = Number.POSITIVE_INFINITY
    const when = (a.scheduledAt?.getTime() ?? never) - (b.scheduledAt?.getTime() ?? never)
    if (Number.isNaN(when)) return a.round - b.round || a.position - b.position

    return when || a.round - b.round || a.position - b.position
  }

  private listItem(
    bracket: BracketProps,
    sport: AdministratorSportShowResponse,
  ): AdministratorBracketPaginateResponse {
    return {
      id: bracket.id,
      sportId: bracket.sportId,
      category: bracket.category,
      status: bracket.status,
      createdAt: bracket.createdAt.toISOString(),
      updatedAt: bracket.updatedAt?.toISOString() ?? null,
      sport,
    }
  }

  private toListItems(bracket: BracketProps): AdministratorBracketPaginateResponse[] {
    const sport = this.sports.get(bracket.sportId)
    if (!sport) return []

    return [this.listItem(bracket, sport)]
  }

  private toPaginateItems(
    bracket: BracketProps,
    match: MatchProps,
  ): AdministratorMatchPaginateResponse[] {
    const sport = this.sports.get(bracket.sportId)
    const home = this.fullTeam(bracket, match.homeTeamId)
    const away = this.fullTeam(bracket, match.awayTeamId)
    if (!sport || !home || !away) return []

    return [
      {
        ...this.matchFields(match, bracket.id),
        homeTeam: this.publicTeam(home),
        awayTeam: this.publicTeam(away),
        bracket: this.listItem(bracket, sport),
      },
    ]
  }

  private matchFields(match: MatchProps, bracketId: string) {
    return {
      id: match.id,
      bracketId,
      phase: match.phase,
      round: match.round,
      position: match.position,
      status: match.status,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      winnerTeamId: match.winnerTeamId,
      scheduledAt: match.scheduledAt?.toISOString() ?? null,
      location: match.location,
      createdAt: match.createdAt.toISOString(),
      updatedAt: match.updatedAt?.toISOString() ?? null,
    }
  }

  private fullTeam(
    bracket: BracketProps,
    teamId: string | null,
  ): AdministratorMatchTeamResponse | null {
    const team = bracket.teams.find((candidate) => candidate.id === teamId)
    const classroom = team && this.classrooms.get(team.classroomId)
    if (!team || !classroom) return null

    return {
      id: team.id,
      bracketId: bracket.id,
      classroomId: team.classroomId,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt?.toISOString() ?? null,
      classroom: {
        id: classroom.id,
        name: classroom.name,
        grade: classroom.grade,
        category: classroom.category,
        advisorId: classroom.advisorId,
        representativeId: classroom.representativeId,
        createdAt: classroom.createdAt.toISOString(),
        updatedAt: classroom.updatedAt?.toISOString() ?? null,
      },
    }
  }

  private publicTeam(team: AdministratorMatchTeamResponse) {
    const { id, name, category } = team.classroom

    return { ...team, classroom: { id, name, category } }
  }
}
