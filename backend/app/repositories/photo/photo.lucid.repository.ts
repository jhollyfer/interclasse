import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import {
  PHOTO_STATUS,
  UPLOAD_STATUS,
  type AdministratorPhotoShowResponse,
  type Paginated,
  type StorefrontPhotoShowResponse,
} from '@interclasse/shared'

import { PhotoRepository, type PhotoListCriteria, type PhotoStorage } from './photo.repository.ts'

import PhotoModel from '#models/photo'
import StorageModel from '#models/storage'
import UserModel from '#models/user'
import { Photo } from '#domain/photo/photo.entity'
import { TransactionContext } from '#repositories/unit-of-work/transaction-context'
import { StorageContract } from '#services/storage/storage.contract'

@inject()
export class PhotoLucidRepository extends PhotoRepository {
  constructor(
    private readonly transaction: TransactionContext,
    private readonly bucket: StorageContract,
  ) {
    super()
  }

  async findById(id: string): Promise<Photo | null> {
    const row = await PhotoModel.query({ client: this.transaction.client() })
      .where('id', id)
      .first()
    if (!row) return null

    return this.toEntity(row)
  }

  async findOwned(id: string, authorId: string): Promise<Photo | null> {
    const row = await PhotoModel.query({ client: this.transaction.client() })
      .where('id', id)
      .where('authorId', authorId)
      .first()
    if (!row) return null

    return this.toEntity(row)
  }

  async findUploadedStorage(storageId: string): Promise<PhotoStorage | null> {
    const row = await StorageModel.query({ client: this.transaction.client() })
      .where('id', storageId)
      .where('status', UPLOAD_STATUS.UPLOADED)
      .withScopes((scopes) => scopes.notDeleted())
      .first()
    if (!row) return null

    return { id: row.id, mimetype: row.mimetype }
  }

  async save(photo: Photo): Promise<void> {
    const { id, createdAt, updatedAt, reviewedAt, ...columns } = photo.snapshot()

    await PhotoModel.updateOrCreate(
      { id },
      {
        ...columns,
        createdAt: DateTime.fromJSDate(createdAt),
        updatedAt: this.dateOrNull(updatedAt),
        reviewedAt: this.dateOrNull(reviewedAt),
      },
      { client: this.transaction.client() },
    )
  }

  async delete(photo: Photo): Promise<void> {
    await PhotoModel.query({ client: this.transaction.client() }).where('id', photo.id).delete()
  }

  async show(id: string): Promise<AdministratorPhotoShowResponse | null> {
    const row = await PhotoModel.query({ client: this.transaction.client() })
      .where('id', id)
      .preload('storage')
      .preload('author')
      .first()
    if (!row) return null

    return this.toResponse(row)
  }

  async paginate(criteria: PhotoListCriteria): Promise<Paginated<AdministratorPhotoShowResponse>> {
    const query = PhotoModel.query({ client: this.transaction.client() })
      .preload('storage')
      .preload('author')
    if (criteria.status) query.where('status', criteria.status)
    if (criteria.authorId) query.where('authorId', criteria.authorId)

    const page = await query.orderBy('createdAt', 'desc').paginate(criteria.page, criteria.perPage)

    return {
      meta: page.getMeta(),
      data: await Promise.all(page.all().map((row) => this.toResponse(row))),
    }
  }

  async paginateApproved(criteria: {
    readonly page: number
    readonly perPage: number
  }): Promise<Paginated<StorefrontPhotoShowResponse>> {
    const page = await PhotoModel.query({ client: this.transaction.client() })
      .where('status', PHOTO_STATUS.APPROVED)
      .preload('storage')
      .orderBy('createdAt', 'desc')
      .paginate(criteria.page, criteria.perPage)

    return {
      meta: page.getMeta(),
      data: await Promise.all(
        page.all().map(async (row) => ({
          id: row.id,
          caption: row.caption,
          url: await this.bucket.signedUrl(row.storage.path),
          createdAt: this.iso(row.createdAt),
        })),
      ),
    }
  }

  private toEntity(row: PhotoModel): Photo {
    return Photo.restore({
      id: row.id,
      storageId: row.storageId,
      authorId: row.authorId,
      caption: row.caption,
      status: row.status,
      reviewedById: row.reviewedById,
      reviewedAt: row.reviewedAt?.toJSDate() ?? null,
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt?.toJSDate() ?? null,
    })
  }

  private async toResponse(row: PhotoModel): Promise<AdministratorPhotoShowResponse> {
    const { storage, author } = row

    return {
      id: row.id,
      storageId: row.storageId,
      caption: row.caption,
      status: row.status,
      authorId: row.authorId,
      reviewedById: row.reviewedById,
      reviewedAt: row.reviewedAt?.toISO() ?? null,
      storage: {
        id: storage.id,
        filename: storage.filename,
        originalName: storage.originalName,
        mimetype: storage.mimetype,
        size: storage.size,
        path: storage.path,
        status: storage.status,
        url: await this.bucket.signedUrl(storage.path),
        createdAt: storage.createdAt?.toISO() ?? null,
        updatedAt: storage.updatedAt?.toISO() ?? null,
        deletedAt: storage.deletedAt?.toISO() ?? null,
      },
      author: this.toAuthor(author),
      createdAt: this.iso(row.createdAt),
      updatedAt: row.updatedAt?.toISO() ?? null,
    }
  }

  private toAuthor(author: UserModel | null): AdministratorPhotoShowResponse['author'] {
    if (!author) return null

    return { id: author.id, name: author.name, email: author.email, role: author.role }
  }

  private iso(date: DateTime): string {
    return date.toISO() ?? ''
  }

  private dateOrNull(date: Date | null): DateTime | null {
    if (!date) return null

    return DateTime.fromJSDate(date)
  }
}
