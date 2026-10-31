import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { left, right } from '@interclasse/shared'
import type { AdministratorSportShowResponse, Either, Paginated } from '@interclasse/shared'

import { SportRepository, type SportListCriteria } from './sport.repository.ts'

import SportModel from '#models/sport'
import { PostgresError } from '#core/postgres-error'
import { Sport } from '#domain/sport/sport.entity'
import type { SportError } from '#domain/sport/sport.errors'
import { TransactionContext } from '#core/transaction-context'

@inject()
export class SportLucidRepository extends SportRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async findById(id: string): Promise<Sport | null> {
    const row = await SportModel.query({ client: this.transaction.client() })
      .where('id', id)
      .first()
    if (!row) return null

    return this.toEntity(row)
  }

  async existsByNameOrSlug(name: string, slug: string, exceptId?: string): Promise<boolean> {
    const query = SportModel.query({ client: this.transaction.client() }).where((builder) => {
      builder.where('name', name).orWhere('slug', slug)
    })
    if (exceptId) query.whereNot('id', exceptId)

    return Boolean(await query.first())
  }

  async largestRoster(sportId: string): Promise<number> {
    const largest: { total: string | number } | null = await this.transaction
      .client()
      .from('enrollments')
      .join('students', 'students.id', 'enrollments.student_id')
      .where('enrollments.sport_id', sportId)
      .groupBy('students.classroom_id')
      .count('* as total')
      .orderBy('total', 'desc')
      .first()

    return Number(largest?.total ?? 0)
  }

  async isInUse(sportId: string): Promise<boolean> {
    const client = this.transaction.client()
    const [enrollment, bracket] = await Promise.all([
      client.from('enrollments').where('sport_id', sportId).first(),
      client.from('brackets').where('sport_id', sportId).first(),
    ])

    return Boolean(enrollment || bracket)
  }

  async save(sport: Sport): Promise<Either<SportError, void>> {
    const { id, createdAt, updatedAt, ...columns } = sport.snapshot()

    try {
      await SportModel.updateOrCreate(
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
      if (PostgresError.isUniqueViolation(error)) return left({ code: 'SPORT_ALREADY_EXISTS' })

      throw error
    }
  }

  async delete(sport: Sport): Promise<void> {
    await SportModel.query({ client: this.transaction.client() }).where('id', sport.id).delete()
  }

  async paginate(criteria: SportListCriteria): Promise<Paginated<AdministratorSportShowResponse>> {
    const query = SportModel.query({ client: this.transaction.client() })
    if (criteria.search) query.whereILike('name', `%${criteria.search}%`)

    const page = await query
      .orderBy(criteria.sort, criteria.direction)
      .paginate(criteria.page, criteria.perPage)

    return {
      meta: page.getMeta(),
      data: page.all().map((row) => this.toResponse(row)),
    }
  }

  private toEntity(row: SportModel): Sport {
    return Sport.restore({
      id: row.id,
      name: row.name,
      slug: row.slug,
      minAthletes: row.minAthletes,
      maxAthletes: row.maxAthletes,
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt?.toJSDate() ?? null,
    })
  }

  private toResponse(row: SportModel): AdministratorSportShowResponse {
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

  private dateOrNull(date: Date | null): DateTime | null {
    if (!date) return null

    return DateTime.fromJSDate(date)
  }
}
