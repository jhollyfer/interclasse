import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import {
  USER_ROLE,
  left,
  right,
  type Actor,
  type AdministratorClassroomPaginateResponse,
  type AdministratorClassroomPersonResponse,
  type AdministratorClassroomShowResponse,
  type Either,
  type Paginated,
  type UserRole,
} from '@interclasse/shared'

import {
  ClassroomRepository,
  type ClassroomListCriteria,
  type ClassroomOwnedListCriteria,
} from './classroom.repository.ts'

import ClassroomModel from '#models/classroom'
import EnrollmentModel from '#models/enrollment'
import StudentModel from '#models/student'
import { PostgresError } from '#core/postgres-error'
import type { ClassroomError } from '#domain/classroom/classroom.errors'
import TeamModel from '#models/team'
import UserModel from '#models/user'
import {
  Classroom,
  type ClassroomLinkFacts,
  type ClassroomLinks,
  type ClassroomPeopleFacts,
} from '#domain/classroom/classroom.entity'
import { TransactionContext } from '#repositories/unit-of-work/transaction-context'

/** Os totais do cartão de cada turma, por id. */
type ClassroomTotals = {
  readonly students: ReadonlyMap<string, number>
  readonly athletes: ReadonlyMap<string, number>
  readonly sports: ReadonlyMap<string, number>
}

@inject()
export class ClassroomLucidRepository extends ClassroomRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async findById(id: string): Promise<Classroom | null> {
    const row = await ClassroomModel.query({ client: this.transaction.client() })
      .where('id', id)
      .first()
    if (!row) return null

    return this.toEntity(row)
  }

  async findOwned(criteria: {
    readonly id: string
    readonly actor: Actor
  }): Promise<Classroom | null> {
    const query = ClassroomModel.query({ client: this.transaction.client() }).where(
      'id',
      criteria.id,
    )
    // Quem não é administrador alcança só a turma que aconselha: papel novo sem
    // vínculo não vê nada (fail-closed, `backend.md` §4.6).
    if (criteria.actor.role !== USER_ROLE.ADMINISTRATOR) query.where('advisorId', criteria.actor.id)

    const row = await query.first()
    if (!row) return null

    return this.toEntity(row)
  }

  async findOfRepresentative(accountId: string): Promise<Classroom | null> {
    const row = await ClassroomModel.query({ client: this.transaction.client() })
      .where('representativeId', accountId)
      .first()
    if (!row) return null

    return this.toEntity(row)
  }

  async findDetail(id: string): Promise<AdministratorClassroomShowResponse | null> {
    const row = await ClassroomModel.query({ client: this.transaction.client() })
      .where('id', id)
      .preload('advisor')
      .preload('representative')
      .first()
    if (!row) return null

    return this.toResponse(row)
  }

  async existsByName(name: string, exceptId?: string): Promise<boolean> {
    const query = ClassroomModel.query({ client: this.transaction.client() }).where('name', name)
    if (exceptId) query.whereNot('id', exceptId)

    return Boolean(await query.first())
  }

  async peopleFacts(
    links: ClassroomLinks,
    exceptClassroomId?: string,
  ): Promise<ClassroomPeopleFacts> {
    const facts: { advisor?: ClassroomLinkFacts; representative?: ClassroomLinkFacts } = {}

    if (links.advisorId)
      facts.advisor = await this.linkFacts(
        'advisorId',
        links.advisorId,
        USER_ROLE.ADVISOR,
        exceptClassroomId,
      )
    if (links.representativeId)
      facts.representative = await this.linkFacts(
        'representativeId',
        links.representativeId,
        USER_ROLE.REPRESENTATIVE,
        exceptClassroomId,
      )

    return facts
  }

  async isInCompetition(id: string): Promise<boolean> {
    const team = await TeamModel.query({ client: this.transaction.client() })
      .where('classroomId', id)
      .first()

    return Boolean(team)
  }

  async save(classroom: Classroom): Promise<Either<ClassroomError, void>> {
    const { id, createdAt, updatedAt, ...columns } = classroom.snapshot()

    try {
      await ClassroomModel.updateOrCreate(
        { id },
        {
          ...columns,
          createdAt: DateTime.fromJSDate(createdAt),
          updatedAt: this.dateOrNull(updatedAt),
        },
        { client: this.transaction.client() },
      )

      return right(undefined)
    } catch (error) {
      if (!PostgresError.isUniqueViolation(error)) throw error

      return left(this.collision(error))
    }
  }

  /**
   * O fato do campo que colidiu: cada `unique` vira o 409 do campo dele, e o nome da
   * turma é o que sobra. O nome do `unique` é o que a migration deu a ele.
   */
  private collision(error: unknown): ClassroomError {
    switch (PostgresError.violatedConstraint(error)) {
      case 'classrooms_advisor_id_unique':
        return { code: 'ADVISOR_TAKEN' }
      case 'classrooms_representative_id_unique':
        return { code: 'REPRESENTATIVE_TAKEN' }
      default:
        return { code: 'CLASSROOM_ALREADY_EXISTS' }
    }
  }

  async delete(classroom: Classroom): Promise<void> {
    await ClassroomModel.query({ client: this.transaction.client() })
      .where('id', classroom.id)
      .delete()
  }

  async detachAccount(accountId: string): Promise<void> {
    const client = this.transaction.client()

    await ClassroomModel.query({ client }).where('advisorId', accountId).update({ advisorId: null })
    await ClassroomModel.query({ client })
      .where('representativeId', accountId)
      .update({ representativeId: null })
  }

  async paginate(
    criteria: ClassroomListCriteria,
  ): Promise<Paginated<AdministratorClassroomPaginateResponse>> {
    const query = ClassroomModel.query({ client: this.transaction.client() })
      .preload('advisor')
      .preload('representative')

    if (criteria.category) query.where('category', criteria.category)
    if (criteria.search) query.whereILike('name', `%${criteria.search}%`)

    const page = await query
      .orderBy(criteria.sort, criteria.direction)
      .paginate(criteria.page, criteria.perPage)

    const rows = page.all()
    const totals = await this.totalsOf(rows.map((row) => row.id))

    return {
      meta: page.getMeta(),
      data: rows.map((row) => ({
        ...this.toResponse(row),
        studentsCount: totals.students.get(row.id) ?? 0,
        athletesCount: totals.athletes.get(row.id) ?? 0,
        sportsCount: totals.sports.get(row.id) ?? 0,
      })),
    }
  }

  /**
   * Os totais do cartão da turma, contados no banco sem carregar alunos nem
   * inscrições: o Lucid só calcula agregado por relação, e a turma não declara a
   * inversa para o model não importar o do aluno (`domain.md` §8, `no-circular`).
   */
  private async totalsOf(classroomIds: ReadonlyArray<string>): Promise<ClassroomTotals> {
    const client = this.transaction.client()
    const students = await StudentModel.query({ client })
      .whereIn('classroomId', [...classroomIds])
      .select('students.classroom_id')
      .count('students.id as total')
      .groupBy('students.classroom_id')
    const enrolled = await EnrollmentModel.query({ client })
      .join('students', 'students.id', 'enrollments.student_id')
      .whereIn('students.classroom_id', [...classroomIds])
      .select('students.classroom_id')
      .countDistinct('enrollments.student_id as athletes')
      .countDistinct('enrollments.sport_id as sports')
      .groupBy('students.classroom_id')

    return {
      students: new Map(students.map((row) => [row.classroomId, Number(row.$extras.total)])),
      athletes: new Map(
        enrolled.map((row) => [row.$extras.classroom_id, Number(row.$extras.athletes)]),
      ),
      sports: new Map(
        enrolled.map((row) => [row.$extras.classroom_id, Number(row.$extras.sports)]),
      ),
    }
  }

  async paginateOwned(
    criteria: ClassroomOwnedListCriteria,
  ): Promise<Paginated<AdministratorClassroomShowResponse>> {
    // Quem cuida da turma vem junto: o cartão mostra o conselheiro e o
    // representante de cada uma.
    const query = ClassroomModel.query({ client: this.transaction.client() })
      .preload('advisor')
      .preload('representative')

    if (criteria.actor.role !== USER_ROLE.ADMINISTRATOR) query.where('advisorId', criteria.actor.id)
    if (criteria.search) query.whereILike('name', `%${criteria.search}%`)

    const page = await query.orderBy('name', 'asc').paginate(criteria.page, criteria.perPage)

    return { meta: page.getMeta(), data: page.all().map((row) => this.toResponse(row)) }
  }

  /** Conta viva com o papel do vínculo, e se outra turma já a tem. */
  private async linkFacts(
    column: 'advisorId' | 'representativeId',
    accountId: string,
    role: UserRole,
    exceptClassroomId?: string,
  ): Promise<ClassroomLinkFacts> {
    const client = this.transaction.client()
    const account = await UserModel.query({ client })
      .where('id', accountId)
      .where('role', role)
      .withScopes((scopes) => scopes.notDeleted())
      .first()

    const taken = ClassroomModel.query({ client }).where(column, accountId)
    if (exceptClassroomId) taken.whereNot('id', exceptClassroomId)

    return { exists: Boolean(account), taken: Boolean(await taken.first()) }
  }

  private toEntity(row: ClassroomModel): Classroom {
    return Classroom.restore({
      id: row.id,
      name: row.name,
      grade: row.grade,
      category: row.category,
      advisorId: row.advisorId,
      representativeId: row.representativeId,
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt?.toJSDate() ?? null,
    })
  }

  private toResponse(row: ClassroomModel): AdministratorClassroomShowResponse {
    return {
      id: row.id,
      name: row.name,
      grade: row.grade,
      category: row.category,
      advisorId: row.advisorId,
      representativeId: row.representativeId,
      createdAt: row.createdAt.toISO() ?? '',
      updatedAt: row.updatedAt?.toISO() ?? null,
      advisor: this.toPerson(row.advisor),
      representative: this.toPerson(row.representative),
    }
  }

  private toPerson(row: UserModel | null | undefined): AdministratorClassroomPersonResponse | null {
    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      avatarId: row.avatarId,
      createdAt: row.createdAt.toISO() ?? '',
      updatedAt: row.updatedAt?.toISO() ?? null,
      deletedAt: row.deletedAt?.toISO() ?? null,
    }
  }

  private dateOrNull(date: Date | null): DateTime | null {
    if (!date) return null

    return DateTime.fromJSDate(date)
  }
}
