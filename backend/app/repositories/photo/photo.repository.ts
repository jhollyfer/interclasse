import type {
  AdministratorPhotoShowResponse,
  Paginated,
  PhotoStatus,
  StorefrontPhotoShowResponse,
} from '@interclasse/shared'

import type { Photo } from '#domain/photo/photo.entity'

/**
 * The photo in the panel response shape, with the file without the `url`: signing belongs to the
 * use case, through the bucket contract (`_standards/architecture.md` §2).
 */
export type PhotoRead = Omit<AdministratorPhotoShowResponse, 'storage'> & {
  readonly storage: Omit<AdministratorPhotoShowResponse['storage'], 'url'>
}

/** The approved site photo: the response without the `url`, with the `path` for the use case to sign. */
export type ApprovedPhotoRead = Omit<StorefrontPhotoShowResponse, 'url'> & {
  readonly path: string
}

export type PhotoListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly status?: PhotoStatus
  /** Only the photos uploaded by this account: the advisor's list. */
  readonly authorId?: string
}

/** The file, in what the photo needs to know about it. */
export type PhotoStorage = {
  readonly id: string
  readonly mimetype: string
}

/**
 * The photo persistence, by intent (`_standards/domain.md` §5.1). The single
 * writer of the `photos` table; it reads `storages` and `users` only to answer.
 */
export abstract class PhotoRepository {
  abstract findById(id: string): Promise<Photo | null>
  /** The photo of whoever uploaded it: another's comes back `null`, same as one that does not exist. */
  abstract findOwned(id: string, authorId: string): Promise<Photo | null>
  /** The file already fully uploaded and not archived; `null` if there is none. */
  abstract findUploadedStorage(storageId: string): Promise<PhotoStorage | null>
  abstract save(photo: Photo): Promise<void>
  abstract delete(photo: Photo): Promise<void>
  /** Lightweight read: the photo with the file and who uploaded, straight from the query. */
  abstract show(id: string): Promise<PhotoRead | null>
  abstract paginate(criteria: PhotoListCriteria): Promise<Paginated<PhotoRead>>
  /** The site carousel: only the approved ones, without author. */
  abstract paginateApproved(criteria: {
    readonly page: number
    readonly perPage: number
  }): Promise<Paginated<ApprovedPhotoRead>>
}
