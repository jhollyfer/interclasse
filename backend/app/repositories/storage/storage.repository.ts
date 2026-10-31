import type {
  Paginated,
  SortDirection,
  StoragesFileShowResponse,
  UploadStatus,
} from '@interclasse/shared'

import type { Storage } from '#domain/storage/storage.entity'

/**
 * The file record in the response shape, without the `url`: signing belongs to the use case, through the
 * bucket contract (`_standards/architecture.md` §2, `StorageContract.withUrl`).
 */
export type StorageFileRead = Omit<StoragesFileShowResponse, 'url'>

export type StorageListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly status?: UploadStatus
  readonly mimetype?: string
  readonly sort: 'originalName' | 'mimetype' | 'size' | 'createdAt'
  readonly direction: SortDirection
}

/**
 * The file persistence, by intent (`_standards/domain.md` §5.1). The
 * single writer of the `storages` table; it reads the columns that point to it only
 * to say where the file is in use.
 */
export abstract class StorageRepository {
  /** The live file, in any upload state. */
  abstract findById(id: string): Promise<Storage | null>
  /** Lightweight read: the record in the response shape, without the URL. */
  abstract detail(id: string): Promise<StorageFileRead | null>
  /** The same record for several ids at once; an id without a live file is left out. */
  abstract detailsOf(ids: ReadonlyArray<string>): Promise<StorageFileRead[]>
  /** All the ids are live, already confirmed (`UPLOADED`) files: only those attach. */
  abstract areAttachable(ids: ReadonlyArray<string>): Promise<boolean>
  /** Where the file is in use, in readable labels; empty means orphan. */
  abstract usedBy(id: string): Promise<string[]>
  abstract save(storage: Storage): Promise<void>
  /** Deletes the row for good: `storages` has no trash. */
  abstract delete(storage: Storage): Promise<void>
  abstract paginate(criteria: StorageListCriteria): Promise<Paginated<StorageFileRead>>
}
