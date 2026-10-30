import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type { AdministratorAnnouncementShowResponse, Paginated } from '@interclasse/shared'

import { AnnouncementRepository, type AnnouncementListCriteria } from './announcement.repository.ts'

import AnnouncementModel from '#models/announcement'
import { Announcement } from '#domain/announcement/announcement.entity'
import { TransactionContext } from '#repositories/unit-of-work/transaction-context'

@inject()
export class AnnouncementLucidRepository extends AnnouncementRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async findById(id: string): Promise<Announcement | null> {
    const row = await AnnouncementModel.query({ client: this.transaction.client() })
      .where('id', id)
      .first()
    if (!row) return null

    return this.toEntity(row)
  }

  async save(announcement: Announcement): Promise<void> {
    const { id, createdAt, updatedAt, ...columns } = announcement.snapshot()

    await AnnouncementModel.updateOrCreate(
      { id },
      {
        ...columns,
        createdAt: DateTime.fromJSDate(createdAt),
        updatedAt: this.dateOrNull(updatedAt),
      },
      { client: this.transaction.client() },
    )
  }

  async delete(announcement: Announcement): Promise<void> {
    await AnnouncementModel.query({ client: this.transaction.client() })
      .where('id', announcement.id)
      .delete()
  }

  async paginate(
    criteria: AnnouncementListCriteria,
  ): Promise<Paginated<AdministratorAnnouncementShowResponse>> {
    const query = AnnouncementModel.query({ client: this.transaction.client() })
    if (criteria.search) query.whereILike('title', `%${criteria.search}%`)
    if (criteria.pinnedFirst) query.orderBy('pinned', 'desc')

    const page = await query
      .orderBy(criteria.sort, criteria.direction)
      .paginate(criteria.page, criteria.perPage)

    return {
      meta: page.getMeta(),
      data: page.all().map((row) => this.toResponse(row)),
    }
  }

  private toEntity(row: AnnouncementModel): Announcement {
    return Announcement.restore({
      id: row.id,
      title: row.title,
      body: row.body,
      pinned: row.pinned,
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt?.toJSDate() ?? null,
    })
  }

  private toResponse(row: AnnouncementModel): AdministratorAnnouncementShowResponse {
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      pinned: row.pinned,
      createdAt: row.createdAt.toISO() ?? '',
      updatedAt: row.updatedAt?.toISO() ?? null,
    }
  }

  private dateOrNull(date: Date | null): DateTime | null {
    if (!date) return null

    return DateTime.fromJSDate(date)
  }
}
