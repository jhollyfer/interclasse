import {
  PHOTO_STATUS,
  UPLOAD_STATUS,
  type AdministratorPhotoShowResponse,
  type Paginated,
  type StorefrontPhotoShowResponse,
} from '@interclasse/shared'

import { PhotoRepository, type PhotoListCriteria, type PhotoStorage } from './photo.repository.ts'

import { Photo, type PhotoProps } from '#domain/photo/photo.entity'
import { MemoryPagination } from '#repositories/memory-pagination'

type StorageRow = AdministratorPhotoShowResponse['storage']
type AuthorRow = NonNullable<AdministratorPhotoShowResponse['author']>

/**
 * A segunda implementação de verdade, para o teste unitário do use-case
 * (`_standards/domain.md` §5.3). Guarda cópias: o teste não altera o "banco"
 * por referência.
 */
export class PhotoMemoryRepository extends PhotoRepository {
  private readonly rows = new Map<string, PhotoProps>()
  private readonly storages = new Map<string, StorageRow>()
  private readonly authors = new Map<string, AuthorRow>()

  /** Arranjo do teste: um arquivo já enviado. */
  withStorage(storage: StorageRow): this {
    this.storages.set(storage.id, storage)
    return this
  }

  /** Arranjo do teste: uma conta que pode ter enviado fotos. */
  withAuthor(author: AuthorRow): this {
    this.authors.set(author.id, author)
    return this
  }

  async findById(id: string): Promise<Photo | null> {
    const props = this.rows.get(id)
    if (!props) return null

    return Photo.restore(structuredClone(props))
  }

  async findOwned(id: string, authorId: string): Promise<Photo | null> {
    const props = this.rows.get(id)
    if (!props || props.authorId !== authorId) return null

    return Photo.restore(structuredClone(props))
  }

  async findUploadedStorage(storageId: string): Promise<PhotoStorage | null> {
    const storage = this.storages.get(storageId)
    if (!storage || storage.status !== UPLOAD_STATUS.UPLOADED || storage.deletedAt !== null)
      return null

    return { id: storage.id, mimetype: storage.mimetype }
  }

  async save(photo: Photo): Promise<void> {
    this.rows.set(photo.id, structuredClone(photo.snapshot()))
  }

  async delete(photo: Photo): Promise<void> {
    this.rows.delete(photo.id)
  }

  async show(id: string): Promise<AdministratorPhotoShowResponse | null> {
    const props = this.rows.get(id)
    if (!props) return null

    return this.toResponse(props)
  }

  async paginate(criteria: PhotoListCriteria): Promise<Paginated<AdministratorPhotoShowResponse>> {
    const matching = this.newestFirst().filter(
      (row) =>
        (!criteria.status || row.status === criteria.status) &&
        (!criteria.authorId || row.authorId === criteria.authorId),
    )
    const page = MemoryPagination.slice(matching, criteria.page, criteria.perPage)

    return { meta: page.meta, data: page.data.map((row) => this.toResponse(row)) }
  }

  async paginateApproved(criteria: {
    readonly page: number
    readonly perPage: number
  }): Promise<Paginated<StorefrontPhotoShowResponse>> {
    const approved = this.newestFirst().filter((row) => row.status === PHOTO_STATUS.APPROVED)
    const page = MemoryPagination.slice(approved, criteria.page, criteria.perPage)

    return {
      meta: page.meta,
      data: page.data.map((row) => ({
        id: row.id,
        caption: row.caption,
        url: this.storages.get(row.storageId)?.url ?? '',
        createdAt: row.createdAt.toISOString(),
      })),
    }
  }

  private newestFirst(): PhotoProps[] {
    return [...this.rows.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  private toResponse(row: PhotoProps): AdministratorPhotoShowResponse {
    const storage = this.storages.get(row.storageId)
    if (!storage) throw new Error('foto sem o arquivo no arranjo do teste')

    return {
      id: row.id,
      storageId: row.storageId,
      caption: row.caption,
      status: row.status,
      authorId: row.authorId,
      reviewedById: row.reviewedById,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      storage,
      author: this.authors.get(row.authorId ?? '') ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt?.toISOString() ?? null,
    }
  }
}
