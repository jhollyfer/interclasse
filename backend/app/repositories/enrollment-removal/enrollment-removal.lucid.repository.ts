import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type {
  AdministratorClassroomPersonResponse,
  AdministratorEnrollmentRemovalShowResponse,
  Paginated,
} from '@interclasse/shared'

import {
  EnrollmentRemovalRepository,
  type EnrollmentRemovalListCriteria,
} from './enrollment-removal.repository.ts'

import ClassroomModel from '#models/classroom'
import EnrollmentRemovalModel from '#models/enrollment-removal'
import SportModel from '#models/sport'
import UserModel from '#models/user'
import {
  EnrollmentRemoval,
  type EnrollmentRemovalProps,
} from '#domain/enrollment-removal/enrollment-removal.entity'
import { TransactionContext } from '#core/transaction-context'

type RelatedResponse = Pick<
  AdministratorEnrollmentRemovalShowResponse,
  'classroom' | 'sport' | 'actor'
>

@inject()
export class EnrollmentRemovalLucidRepository extends EnrollmentRemovalRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async findById(id: string): Promise<EnrollmentRemoval | null> {
    const row = await EnrollmentRemovalModel.query({ client: this.transaction.client() })
      .where('id', id)
      .first()
    if (!row) return null

    return this.toEntity(row)
  }

  async save(removal: EnrollmentRemoval): Promise<void> {
    const { id, ...columns } = removal.snapshot()

    await EnrollmentRemovalModel.updateOrCreate({ id }, this.toColumns(columns), {
      client: this.transaction.client(),
    })
  }

  async saveAll(removals: EnrollmentRemoval[]): Promise<void> {
    if (removals.length === 0) return

    await EnrollmentRemovalModel.createMany(
      removals.map((removal) => {
        const { id, ...columns } = removal.snapshot()

        return { id, ...this.toColumns(columns) }
      }),
      { client: this.transaction.client() },
    )
  }

  async findDetail(id: string): Promise<AdministratorEnrollmentRemovalShowResponse | null> {
    const row = await EnrollmentRemovalModel.query({ client: this.transaction.client() })
      .where('id', id)
      .preload('classroom')
      .preload('sport')
      .preload('actor')
      .first()
    if (!row) return null

    return this.toResponse(row)
  }

  async paginate(
    criteria: EnrollmentRemovalListCriteria,
  ): Promise<Paginated<AdministratorEnrollmentRemovalShowResponse>> {
    const query = EnrollmentRemovalModel.query({ client: this.transaction.client() })
      .preload('classroom')
      .preload('sport')
      .preload('actor')

    if (criteria.pending === true) query.whereNull('acknowledgedAt')
    if (criteria.pending === false) query.whereNotNull('acknowledgedAt')
    if (criteria.classroomId) query.where('classroomId', criteria.classroomId)

    const page = await query
      .orderByRaw('acknowledged_at is null desc')
      .orderBy('createdAt', 'desc')
      .paginate(criteria.page, criteria.perPage)

    return { meta: page.getMeta(), data: page.all().map((row) => this.toResponse(row)) }
  }

  private toEntity(row: EnrollmentRemovalModel): EnrollmentRemoval {
    return EnrollmentRemoval.restore({
      id: row.id,
      classroomId: row.classroomId,
      sportId: row.sportId,
      studentId: row.studentId,
      studentName: row.studentName,
      reason: row.reason,
      actorId: row.actorId,
      acknowledgedAt: row.acknowledgedAt?.toJSDate() ?? null,
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt?.toJSDate() ?? null,
    })
  }

  private toColumns(columns: Omit<EnrollmentRemovalProps, 'id'>) {
    return {
      ...columns,
      acknowledgedAt: this.dateOrNull(columns.acknowledgedAt),
      createdAt: DateTime.fromJSDate(columns.createdAt),
      updatedAt: this.dateOrNull(columns.updatedAt),
    }
  }

  private toResponse(row: EnrollmentRemovalModel): AdministratorEnrollmentRemovalShowResponse {
    return {
      id: row.id,
      classroomId: row.classroomId,
      sportId: row.sportId,
      studentId: row.studentId,
      studentName: row.studentName,
      reason: row.reason,
      actorId: row.actorId,
      acknowledgedAt: row.acknowledgedAt?.toISO() ?? null,
      createdAt: row.createdAt.toISO() ?? '',
      updatedAt: row.updatedAt?.toISO() ?? null,
      ...this.related(row),
    }
  }

  private related(row: EnrollmentRemovalModel): RelatedResponse {
    return {
      classroom: this.toClassroom(row.classroom),
      sport: this.toSport(row.sport),
      actor: this.toPerson(row.actor),
    }
  }

  private toClassroom(row: ClassroomModel): RelatedResponse['classroom'] {
    return {
      id: row.id,
      name: row.name,
      grade: row.grade,
      category: row.category,
      advisorId: row.advisorId,
      representativeId: row.representativeId,
      createdAt: row.createdAt.toISO() ?? '',
      updatedAt: row.updatedAt?.toISO() ?? null,
    }
  }

  private toSport(row: SportModel): RelatedResponse['sport'] {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      minAthletes: row.minAthletes,
      maxAthletes: row.maxAthletes,
      createdAt: row.createdAt.toISO() ?? '',
      updatedAt: row.updatedAt?.toISO() ?? null,
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
