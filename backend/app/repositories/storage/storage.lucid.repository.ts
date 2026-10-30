import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { UPLOAD_STATUS } from '@interclasse/shared'
import type { Paginated } from '@interclasse/shared'

import {
  StorageRepository,
  type StorageFileRead,
  type StorageListCriteria,
} from './storage.repository.ts'

import StorageModel from '#models/storage'
import { Storage } from '#domain/storage/storage.entity'
import { TransactionContext } from '#repositories/unit-of-work/transaction-context'

/**
 * Toda coluna que aponta para `storages`, com o rótulo que a mensagem de erro
 * mostra quando o arquivo está em uso.
 *
 * Uma lista só de objetos, e não listas casadas por índice: com duas, uma
 * inserção no meio de uma delas troca o rótulo de todas as seguintes. Toda
 * referência a `storages` é `SET NULL` ou `CASCADE`, então o banco não impediria
 * nada: uma coluna que faltar aqui é um arquivo em uso que some sem aviso.
 */
const REFERENCES = [
  { table: 'users', column: 'avatar_id', label: 'avatar de usuário' },
  { table: 'photos', column: 'storage_id', label: 'foto da galeria' },
  { table: 'site_settings', column: 'regulation_id', label: 'regulamento do site' },
] as const

@inject()
export class StorageLucidRepository extends StorageRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async findById(id: string): Promise<Storage | null> {
    const row = await StorageModel.query({ client: this.transaction.client() })
      .where('id', id)
      .withScopes((scopes) => scopes.notDeleted())
      .first()
    if (!row) return null

    return this.toEntity(row)
  }

  async detail(id: string): Promise<StorageFileRead | null> {
    const row = await StorageModel.query({ client: this.transaction.client() })
      .where('id', id)
      .withScopes((scopes) => scopes.notDeleted())
      .first()
    if (!row) return null

    return this.toResponse(row)
  }

  async detailsOf(ids: ReadonlyArray<string>): Promise<StorageFileRead[]> {
    if (ids.length === 0) return []

    const rows = await StorageModel.query({ client: this.transaction.client() })
      .whereIn('id', [...new Set(ids)])
      .withScopes((scopes) => scopes.notDeleted())

    return rows.map((row) => this.toResponse(row))
  }

  async areAttachable(ids: ReadonlyArray<string>): Promise<boolean> {
    const unique = [...new Set(ids)]
    if (unique.length === 0) return true

    const rows = await StorageModel.query({ client: this.transaction.client() })
      .whereIn('id', unique)
      .where('status', UPLOAD_STATUS.UPLOADED)
      .withScopes((scopes) => scopes.notDeleted())

    return rows.length === unique.length
  }

  async usedBy(id: string): Promise<string[]> {
    const client = this.transaction.client()
    const counts = await Promise.all(
      REFERENCES.map(async (reference) => {
        const rows = await client
          .from(reference.table)
          .where(reference.column, id)
          .count('* as total')

        // `count` do Postgres é `bigint`, e o driver o entrega como string.
        return { label: reference.label, total: Number(rows[0]?.total ?? 0) }
      }),
    )

    return counts.filter((count) => count.total > 0).map((count) => count.label)
  }

  async save(storage: Storage): Promise<void> {
    const { id, createdAt, updatedAt, deletedAt, ...columns } = storage.snapshot()

    await StorageModel.updateOrCreate(
      { id },
      {
        ...columns,
        createdAt: this.dateOrNull(createdAt),
        updatedAt: this.dateOrNull(updatedAt),
        deletedAt: this.dateOrNull(deletedAt),
      },
      { client: this.transaction.client() },
    )
  }

  async delete(storage: Storage): Promise<void> {
    await StorageModel.query({ client: this.transaction.client() }).where('id', storage.id).delete()
  }

  async paginate(criteria: StorageListCriteria): Promise<Paginated<StorageFileRead>> {
    const query = StorageModel.query({ client: this.transaction.client() }).withScopes((scopes) =>
      scopes.notDeleted(),
    )

    if (criteria.status) query.where('status', criteria.status)
    if (criteria.mimetype) query.where('mimetype', criteria.mimetype)

    // O `OR` vai dentro de uma subquery: encadeado direto ele escaparia do
    // `AND` anterior, e a busca anularia o filtro de status.
    if (criteria.search) {
      const search = `%${criteria.search}%`

      query.where((builder) => {
        builder
          .whereILike('originalName', search)
          .orWhereILike('filename', search)
          .orWhereILike('mimetype', search)
      })
    }

    const page = await query
      .orderBy(criteria.sort, criteria.direction)
      .paginate(criteria.page, criteria.perPage)

    return {
      meta: page.getMeta(),
      data: page.all().map((row) => this.toResponse(row)),
    }
  }

  private toEntity(row: StorageModel): Storage {
    return Storage.restore({
      id: row.id,
      filename: row.filename,
      originalName: row.originalName,
      mimetype: row.mimetype,
      size: row.size,
      path: row.path,
      status: row.status,
      uploadId: row.uploadId,
      partSize: row.partSize,
      createdAt: row.createdAt?.toJSDate() ?? null,
      updatedAt: row.updatedAt?.toJSDate() ?? null,
      deletedAt: row.deletedAt?.toJSDate() ?? null,
    })
  }

  /** A `url` não sai daqui: o use-case a assina, pelo contrato do bucket, a cada leitura. */
  private toResponse(row: StorageModel): StorageFileRead {
    return {
      id: row.id,
      filename: row.filename,
      originalName: row.originalName,
      mimetype: row.mimetype,
      size: row.size,
      path: row.path,
      status: row.status,
      uploadId: row.uploadId,
      partSize: row.partSize,
      createdAt: row.createdAt?.toISO() ?? null,
      updatedAt: row.updatedAt?.toISO() ?? null,
      deletedAt: row.deletedAt?.toISO() ?? null,
    }
  }

  private dateOrNull(date: Date | null): DateTime | null {
    if (!date) return null

    return DateTime.fromJSDate(date)
  }
}
