import { randomUUID } from 'node:crypto'

import { type I18n } from '@adonisjs/i18n'
import { left, right, type AdministratorPhotoShowResponse, type Either } from '@interclasse/shared'

import { PhotoReadBase } from '#features/_shared.photo-read.base'
import { PhotoRefusal } from '#features/administrator/photos/_shared.photo-refusal'
import { Photo, type PhotoSender } from '#domain/photo/photo.entity'
import { type PhotoRepository } from '#repositories/photo/photo.repository'
import HTTPException from '#exceptions/http.exception'
import type { StorageContract } from '#services/storage/storage.contract'

type Submission = {
  readonly storageId: string
  readonly caption?: string | null
  readonly author: { readonly id: string }
  readonly sender: PhotoSender
}

/**
 * Submitting a photo, the same for the advisor and the panel: only who
 * submits changes, and with it the state the photo is born in (the entity decides). It lives here
 * and not in each use case so the file rule does not exist in two places
 * (template method, `_standards/backend.md` §4.2).
 *
 * Infrastructure errors bubble up: the use case's try/catch handles them.
 */
export abstract class PhotoSubmissionBase extends PhotoReadBase {
  protected constructor(photos: PhotoRepository, bucket: StorageContract, i18n: I18n) {
    super(photos, bucket, i18n)
  }

  protected async submit(
    input: Submission,
  ): Promise<Either<HTTPException, AdministratorPhotoShowResponse>> {
    const storage = await this.photos.findUploadedStorage(input.storageId)
    if (!storage) return left(PhotoRefusal.storageNotFound(this.i18n))

    const created = Photo.create({
      id: randomUUID(),
      storage,
      caption: input.caption,
      author: input.author,
      sender: input.sender,
      now: new Date(),
    })
    if (created.isLeft()) return left(PhotoRefusal.http(created.value, this.i18n))

    await this.photos.save(created.value)
    const shown = await this.photos.show(created.value.id)
    if (!shown)
      return left(HTTPException.NotFound(this.i18n.t('photos.not_found'), 'PHOTO_NOT_FOUND'))

    return right(await this.signed(shown))
  }
}
