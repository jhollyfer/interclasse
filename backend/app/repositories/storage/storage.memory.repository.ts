import { UPLOAD_STATUS } from '@interclasse/shared'
import type { Paginated, SortDirection, StoragesFileShowResponse } from '@interclasse/shared'

import { StorageRepository, type StorageListCriteria } from './storage.repository.ts'

import { Storage, type StorageProps } from '#domain/storage/storage.entity'
import { MemoryPagination } from '#repositories/memory-pagination'

/** O sinal da comparação por sentido de ordenação. */
const SIGN = { asc: 1, desc: -1 } satisfies Record<SortDirection, number>

/**
 * A segunda implementação de verdade, para o teste unitário do use-case
 * (`_standards/domain.md` §5.3). Guarda cópias: o teste não altera o "banco"
 * por referência.
 */
export class StorageMemoryRepository extends StorageRepository {
  private readonly rows = new Map<string, StorageProps>()
  private readonly uses = new Map<string, string[]>()

  /** Arranjo do teste: o arquivo está em uso nestes rótulos. */
  markUsed(id: string, labels: string[]): this {
    this.uses.set(id, labels)
    return this
  }

  async findById(id: string): Promise<Storage | null> {
    const props = this.rows.get(id)
    if (!props || props.deletedAt) return null

    return Storage.restore(structuredClone(props))
  }

  async detail(id: string): Promise<StoragesFileShowResponse | null> {
    const props = this.rows.get(id)
    if (!props || props.deletedAt) return null

    return this.toResponse(props)
  }

  async detailsOf(ids: ReadonlyArray<string>): Promise<StoragesFileShowResponse[]> {
    return [...new Set(ids)].flatMap((id) => {
      const props = this.rows.get(id)

      if (!props || props.deletedAt) return []

      return [this.toResponse(props)]
    })
  }

  async areAttachable(ids: ReadonlyArray<string>): Promise<boolean> {
    return [...new Set(ids)].every((id) => {
      const props = this.rows.get(id)

      return props !== undefined && !props.deletedAt && props.status === UPLOAD_STATUS.UPLOADED
    })
  }

  async usedBy(id: string): Promise<string[]> {
    return this.uses.get(id) ?? []
  }

  async save(storage: Storage): Promise<void> {
    this.rows.set(storage.id, structuredClone(storage.snapshot()))
  }

  async delete(storage: Storage): Promise<void> {
    this.rows.delete(storage.id)
  }

  async paginate(criteria: StorageListCriteria): Promise<Paginated<StoragesFileShowResponse>> {
    const search = criteria.search?.toLowerCase()
    const sign = SIGN[criteria.direction]
    const all = [...this.rows.values()]
      .filter((row) => !row.deletedAt)
      .filter((row) => !criteria.status || row.status === criteria.status)
      .filter((row) => !criteria.mimetype || row.mimetype === criteria.mimetype)
      .filter(
        (row) =>
          !search ||
          [row.originalName, row.filename, row.mimetype].some((value) =>
            value.toLowerCase().includes(search),
          ),
      )
      .sort((a, b) => sign * this.compare(a, b, criteria.sort))
    const page = MemoryPagination.slice(all, criteria.page, criteria.perPage)

    return {
      meta: page.meta,
      data: page.data.map((row) => this.toResponse(row)),
    }
  }

  private compare(a: StorageProps, b: StorageProps, sort: StorageListCriteria['sort']): number {
    if (sort === 'size') return a.size - b.size
    if (sort === 'createdAt') return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)

    return a[sort].localeCompare(b[sort])
  }

  private toResponse(props: StorageProps): StoragesFileShowResponse {
    return {
      id: props.id,
      filename: props.filename,
      originalName: props.originalName,
      mimetype: props.mimetype,
      size: props.size,
      path: props.path,
      status: props.status,
      uploadId: props.uploadId,
      partSize: props.partSize,
      createdAt: props.createdAt?.toISOString() ?? null,
      updatedAt: props.updatedAt?.toISOString() ?? null,
      deletedAt: props.deletedAt?.toISOString() ?? null,
      url: `memory://${props.path}`,
    }
  }
}
