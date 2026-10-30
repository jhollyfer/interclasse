import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
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

import BracketModel from '#models/bracket'
import ClassroomModel from '#models/classroom'
import EnrollmentModel from '#models/enrollment'
import MatchModel from '#models/match'
import SportModel from '#models/sport'
import StudentModel from '#models/student'
import TeamModel from '#models/team'
import { PostgresError } from '#core/postgres-error'
import { Bracket, type BracketProps, type MatchProps } from '#domain/bracket/bracket.entity'
import type { BracketError } from '#domain/bracket/bracket.errors'
import { Knockout } from '#domain/shared/knockout.value-object'
import { TransactionContext } from '#repositories/unit-of-work/transaction-context'

@inject()
export class BracketLucidRepository extends BracketRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async findById(id: string): Promise<Bracket | null> {
    const row = await BracketModel.query({ client: this.transaction.client() })
      .where('id', id)
      .preload('teams')
      .preload('matches', (matches) => {
        matches.orderBy('round', 'asc').orderBy('position', 'asc')
      })
      .first()
    if (!row) return null

    return this.toEntity(row)
  }

  async findByMatchId(matchId: string): Promise<Bracket | null> {
    const match = await MatchModel.query({ client: this.transaction.client() })
      .where('id', matchId)
      .first()
    if (!match) return null

    return this.findById(match.bracketId)
  }

  async findByMatchIdForUpdate(matchId: string): Promise<Bracket | null> {
    const client = this.transaction.client()
    const match = await MatchModel.query({ client }).where('id', matchId).first()
    if (!match) return null

    await BracketModel.query({ client }).where('id', match.bracketId).forUpdate().first()

    return this.findById(match.bracketId)
  }

  async findBySportAndCategory(sportId: string, category: Category): Promise<Bracket | null> {
    const row = await BracketModel.query({ client: this.transaction.client() })
      .where('sportId', sportId)
      .where('category', category)
      .first()
    if (!row) return null

    return this.findById(row.id)
  }

  async findSport(sportId: string): Promise<AdministratorSportShowResponse | null> {
    const row = await SportModel.query({ client: this.transaction.client() })
      .where('id', sportId)
      .first()
    if (!row) return null

    return this.toSportResponse(row)
  }

  async lockSport(sportId: string): Promise<AdministratorSportShowResponse | null> {
    const row = await SportModel.query({ client: this.transaction.client() })
      .where('id', sportId)
      .forUpdate()
      .first()
    if (!row) return null

    return this.toSportResponse(row)
  }

  async eligibleClassroomIds(
    sportId: string,
    category: Category,
    minAthletes: number,
  ): Promise<string[]> {
    const rows: Array<{ id: string }> = await this.transaction
      .client()
      .from('classrooms')
      .join('students', 'students.classroom_id', 'classrooms.id')
      .join('enrollments', 'enrollments.student_id', 'students.id')
      .where('classrooms.category', category)
      .where('enrollments.sport_id', sportId)
      .groupBy('classrooms.id')
      .havingRaw('count(enrollments.id) >= ?', [minAthletes])
      .select('classrooms.id')

    return rows.map((row) => row.id)
  }

  async classroomNames(classroomIds: ReadonlyArray<string>): Promise<Map<string, string>> {
    const rows = await ClassroomModel.query({ client: this.transaction.client() })
      .whereIn('id', [...classroomIds])
      .select('id', 'name')

    return new Map(rows.map((row) => [row.id, row.name]))
  }

  async save(bracket: Bracket): Promise<Either<BracketError, void>> {
    const client = this.transaction.client()
    const snapshot = bracket.snapshot()
    const existing = await BracketModel.query({ client }).where('id', snapshot.id).first()

    if (!existing) return this.insert(bracket)

    await this.update(existing, snapshot)

    return right(undefined)
  }

  /**
   * A chave nova, com times e partidas. Dois sorteios ao mesmo tempo esbarram no
   * `unique` de modalidade e categoria, e o segundo volta como fato.
   */
  private async insert(bracket: Bracket): Promise<Either<BracketError, void>> {
    const client = this.transaction.client()
    const snapshot = bracket.snapshot()

    try {
      await BracketModel.create(
        {
          id: snapshot.id,
          sportId: snapshot.sportId,
          category: snapshot.category,
          status: snapshot.status,
          createdAt: DateTime.fromJSDate(snapshot.createdAt),
          updatedAt: this.dateOrNull(snapshot.updatedAt),
        },
        { client },
      )
      await TeamModel.createMany(
        snapshot.teams.map((team) => ({
          id: team.id,
          bracketId: snapshot.id,
          classroomId: team.classroomId,
          createdAt: DateTime.fromJSDate(team.createdAt),
          updatedAt: this.dateOrNull(team.updatedAt),
        })),
        { client },
      )
      // Num `createMany` só: um INSERT por partida eram até 15 idas ao banco
      // com a linha da modalidade travada.
      await MatchModel.createMany(
        snapshot.matches.map((match) => this.toMatchColumns(snapshot.id, match)),
        { client },
      )

      return right(undefined)
    } catch (error) {
      if (PostgresError.isUniqueViolation(error)) return left({ code: 'BRACKET_ALREADY_EXISTS' })

      throw error
    }
  }

  /** O que mudou numa chave já gravada: o status e as partidas. */
  private async update(existing: BracketModel, snapshot: Readonly<BracketProps>): Promise<void> {
    const client = this.transaction.client()

    if (existing.status !== snapshot.status)
      await BracketModel.updateOrCreate(
        { id: snapshot.id },
        { status: snapshot.status, updatedAt: this.dateOrNull(snapshot.updatedAt) },
        { client },
      )

    const rows = await MatchModel.query({ client }).where('bracketId', snapshot.id)
    const current = new Map(snapshot.matches.map((match) => [match.id, match]))

    for (const row of rows) {
      const match = current.get(row.id)
      if (!match || !this.differs(row, match)) continue

      await MatchModel.updateOrCreate({ id: row.id }, this.toMatchColumns(snapshot.id, match), {
        client,
      })
    }
  }

  async delete(bracket: Bracket): Promise<void> {
    await BracketModel.query({ client: this.transaction.client() }).where('id', bracket.id).delete()
  }

  async preview(
    sportId: string,
    category: Category,
  ): Promise<AdministratorBracketPreviewResponse | null> {
    const client = this.transaction.client()
    const sport = await SportModel.query({ client }).where('id', sportId).first()
    if (!sport) return null

    const rows: Array<{ id: string; name: string; grade: number; athletes: string | number }> =
      await client
        .from('classrooms')
        .leftJoin('students', 'students.classroom_id', 'classrooms.id')
        .leftJoin('enrollments', (join) => {
          join
            .on('enrollments.student_id', '=', 'students.id')
            .andOnVal('enrollments.sport_id', '=', sport.id)
        })
        .where('classrooms.category', category)
        .groupBy('classrooms.id', 'classrooms.name', 'classrooms.grade')
        .orderBy('classrooms.grade', 'asc')
        .orderBy('classrooms.name', 'asc')
        .select('classrooms.id', 'classrooms.name', 'classrooms.grade')
        .count('enrollments.id as athletes')

    const drawn = await BracketModel.query({ client })
      .where('sportId', sport.id)
      .where('category', category)
      .first()

    return {
      minAthletes: sport.minAthletes,
      maxTeams: Knockout.MAX_TEAMS,
      drawn: drawn !== null,
      classrooms: rows.map((row) => {
        const athletes = Number(row.athletes)

        return { id: row.id, name: row.name, athletes, eligible: athletes >= sport.minAthletes }
      }),
    }
  }

  async paginate(
    criteria: BracketListCriteria,
  ): Promise<Paginated<AdministratorBracketPaginateResponse>> {
    const client = this.transaction.client()
    const query = BracketModel.query({ client }).preload('sport')

    if (criteria.sportId) query.where('sportId', criteria.sportId)
    if (criteria.category) query.where('category', criteria.category)
    if (criteria.status) query.where('status', criteria.status)

    if (criteria.order === 'newest') query.orderBy('createdAt', 'desc')

    // Por modalidade e categoria: é como o site agrupa as abas.
    if (criteria.order === 'sport-name')
      query
        .orderBy(
          SportModel.query({ client }).whereColumn('sports.id', 'brackets.sport_id').select('name'),
          'asc',
        )
        .orderBy('category', 'asc')

    const page = await query.paginate(criteria.page, criteria.perPage)

    return {
      meta: page.getMeta(),
      data: page.all().map((row) => this.toListItem(row)),
    }
  }

  async paginateMatches(
    criteria: MatchListCriteria,
  ): Promise<Paginated<AdministratorMatchPaginateResponse>> {
    const query = MatchModel.query({ client: this.transaction.client() })
      .whereNotNull('homeTeamId')
      .whereNotNull('awayTeamId')
      .preload('homeTeam', (team) => {
        team.preload('classroom', (classroom) => {
          classroom.select('id', 'name', 'category')
        })
      })
      .preload('awayTeam', (team) => {
        team.preload('classroom', (classroom) => {
          classroom.select('id', 'name', 'category')
        })
      })
      .preload('bracket', (bracket) => {
        bracket.preload('sport')
      })

    if (criteria.bracketId) query.where('bracketId', criteria.bracketId)
    if (criteria.phase) query.where('phase', criteria.phase)
    if (criteria.status) query.where('status', criteria.status)
    if (criteria.classroomId) {
      const classroomId = criteria.classroomId
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

    if (criteria.sportId || criteria.category) {
      query.whereHas('bracket', (bracket) => {
        if (criteria.sportId) bracket.where('sportId', criteria.sportId)
        if (criteria.category) bracket.where('category', criteria.category)
      })
    }

    this.orderMatches(query, criteria)

    const page = await query.paginate(criteria.page, criteria.perPage)

    return {
      meta: page.getMeta(),
      data: page.all().map((row) => ({
        ...this.toMatchColumnsResponse(row),
        homeTeam: this.toPublicTeam(row.homeTeam),
        awayTeam: this.toPublicTeam(row.awayTeam),
        bracket: this.toListItem(row.bracket),
      })),
    }
  }

  async findMatchResponses(
    matchIds: ReadonlyArray<string>,
  ): Promise<Map<string, AdministratorMatchUpdateResponse>> {
    const rows = await MatchModel.query({ client: this.transaction.client() })
      .whereIn('id', [...matchIds])
      .preload('homeTeam', (team) => {
        team.preload('classroom')
      })
      .preload('awayTeam', (team) => {
        team.preload('classroom')
      })
      .preload('bracket', (bracket) => {
        bracket.preload('sport')
      })

    return new Map(
      rows.map((row) => [
        row.id,
        {
          ...this.toMatchColumnsResponse(row),
          homeTeam: this.toFullTeam(row.homeTeam),
          awayTeam: this.toFullTeam(row.awayTeam),
          bracket: this.toListItem(row.bracket),
        },
      ]),
    )
  }

  async matchAthletes(matchId: string): Promise<AdministratorMatchAthletesResponse | null> {
    const client = this.transaction.client()
    const match = await MatchModel.query({ client })
      .where('id', matchId)
      .preload('bracket')
      .preload('homeTeam', (team) => {
        team.preload('classroom')
      })
      .preload('awayTeam', (team) => {
        team.preload('classroom')
      })
      .first()
    if (!match) return null

    const teams = [match.homeTeam, match.awayTeam].filter((team) => team !== null)
    const students = await StudentModel.query({ client })
      .whereIn(
        'classroomId',
        teams.map((team) => team.classroomId),
      )
      .orderBy('name', 'asc')
    const enrolled = await EnrollmentModel.query({ client })
      .where('sportId', match.bracket.sportId)
      .whereIn(
        'studentId',
        students.map((student) => student.id),
      )
    const athletes = new Set(enrolled.map((enrollment) => enrollment.studentId))

    return {
      teams: teams.map((team) => ({
        teamId: team.id,
        classroomId: team.classroomId,
        name: team.classroom.name,
        students: students
          .filter((student) => student.classroomId === team.classroomId)
          .map((student) => ({
            id: student.id,
            name: student.name,
            enrolled: athletes.has(student.id),
          }))
          .sort((a, b) => Number(b.enrolled) - Number(a.enrolled)),
      })),
    }
  }

  /** As marcadas por horário, depois as sem horário por rodada; resultado, o mais recente. */
  private orderMatches(
    query: ModelQueryBuilderContract<typeof MatchModel>,
    criteria: MatchListCriteria,
  ): void {
    if (criteria.order === 'recent-results') {
      query.orderBy('updatedAt', 'desc')
      return
    }

    query
      .orderByRaw('scheduled_at asc nulls last')
      .orderBy('round', 'asc')
      .orderBy('position', 'asc')
  }

  private toEntity(row: BracketModel): Bracket {
    return Bracket.restore({
      id: row.id,
      sportId: row.sportId,
      category: row.category,
      status: row.status,
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt?.toJSDate() ?? null,
      teams: row.teams.map((team) => ({
        id: team.id,
        classroomId: team.classroomId,
        createdAt: team.createdAt.toJSDate(),
        updatedAt: team.updatedAt?.toJSDate() ?? null,
      })),
      matches: row.matches.map((match) => ({
        id: match.id,
        phase: match.phase,
        round: match.round,
        position: match.position,
        status: match.status,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        winnerTeamId: match.winnerTeamId,
        scheduledAt: match.scheduledAt?.toJSDate() ?? null,
        location: match.location,
        createdAt: match.createdAt.toJSDate(),
        updatedAt: match.updatedAt?.toJSDate() ?? null,
      })),
    })
  }

  private toMatchColumns(bracketId: string, match: MatchProps) {
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
      scheduledAt: this.dateOrNull(match.scheduledAt),
      location: match.location,
      createdAt: DateTime.fromJSDate(match.createdAt),
      updatedAt: this.dateOrNull(match.updatedAt),
    }
  }

  /** O que mudou na partida desde que a linha foi lida: só estas viram UPDATE. */
  private differs(row: MatchModel, match: MatchProps): boolean {
    return (
      row.status !== match.status ||
      row.homeTeamId !== match.homeTeamId ||
      row.awayTeamId !== match.awayTeamId ||
      row.homeScore !== match.homeScore ||
      row.awayScore !== match.awayScore ||
      row.winnerTeamId !== match.winnerTeamId ||
      row.location !== match.location ||
      (row.scheduledAt?.toMillis() ?? null) !== (match.scheduledAt?.getTime() ?? null)
    )
  }

  private toSportResponse(row: SportModel): AdministratorSportShowResponse {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      minAthletes: row.minAthletes,
      maxAthletes: row.maxAthletes,
      createdAt: this.iso(row.createdAt),
      updatedAt: this.isoOrNull(row.updatedAt),
    }
  }

  private toListItem(row: BracketModel): AdministratorBracketPaginateResponse {
    return {
      id: row.id,
      sportId: row.sportId,
      category: row.category,
      status: row.status,
      createdAt: this.iso(row.createdAt),
      updatedAt: this.isoOrNull(row.updatedAt),
      sport: this.toSportResponse(row.sport),
    }
  }

  private toMatchColumnsResponse(row: MatchModel) {
    return {
      id: row.id,
      bracketId: row.bracketId,
      phase: row.phase,
      round: row.round,
      position: row.position,
      status: row.status,
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      winnerTeamId: row.winnerTeamId,
      scheduledAt: this.isoOrNull(row.scheduledAt),
      location: row.location,
      createdAt: this.iso(row.createdAt),
      updatedAt: this.isoOrNull(row.updatedAt),
    }
  }

  private toPublicTeam(team: TeamModel) {
    return {
      id: team.id,
      bracketId: team.bracketId,
      classroomId: team.classroomId,
      createdAt: this.iso(team.createdAt),
      updatedAt: this.isoOrNull(team.updatedAt),
      classroom: {
        id: team.classroom.id,
        name: team.classroom.name,
        category: team.classroom.category,
      },
    }
  }

  private toFullTeam(team: TeamModel | null): AdministratorMatchTeamResponse | null {
    if (!team) return null

    return {
      id: team.id,
      bracketId: team.bracketId,
      classroomId: team.classroomId,
      createdAt: this.iso(team.createdAt),
      updatedAt: this.isoOrNull(team.updatedAt),
      classroom: {
        id: team.classroom.id,
        name: team.classroom.name,
        grade: team.classroom.grade,
        category: team.classroom.category,
        advisorId: team.classroom.advisorId,
        representativeId: team.classroom.representativeId,
        createdAt: this.iso(team.classroom.createdAt),
        updatedAt: this.isoOrNull(team.classroom.updatedAt),
      },
    }
  }

  private iso(date: DateTime): string {
    return date.toISO() ?? ''
  }

  private isoOrNull(date: DateTime | null): string | null {
    return date?.toISO() ?? null
  }

  private dateOrNull(date: Date | null): DateTime | null {
    if (!date) return null

    return DateTime.fromJSDate(date)
  }
}
