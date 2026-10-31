import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either, type StoragesFileUploadResponse } from '@interclasse/shared'

import { FilePresenter } from '../files.presenter.ts'

import type { Storage } from '#domain/storage/storage.entity'
import HTTPException from '#exceptions/http.exception'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import {
  MultipartContract,
  PART_SIZE,
  PRESIGNED_BATCH,
  type PartToSign,
  type PresignedPart,
  type UploadedPart,
} from '#services/multipart/multipart.contract'
import { countParts, pendingParts, sizedParts } from '#features/storages/_shared.parts'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, StoragesFileUploadResponse>

/**
 * Where to continue from: what the bucket has already received, and a new URL for what is missing.
 *
 * One endpoint for two cases that are the same problem:
 *
 * - **resume.** The connection dropped at part 900 of a thousand. Without this, the only way out
 *   would be to start over - and starting over on a large file is what
 *   makes a bad network impassable instead of merely slow.
 * - **next batch.** The URLs come out in batches (`PRESIGNED_BATCH`), because signing
 *   a thousand at once would be half a megabyte of JSON before the first byte goes up.
 *   Whoever finished the batch asks for the next one here.
 *
 * Signing again is the point, not a side effect: a signed URL expires, and
 * an upload that lasted longer than the validity finds here a new address for the
 * same part. That is why the response re-signs instead of returning the URLs
 * originals.
 */
@inject()
export default class StoragesFilePartsUseCase {
  constructor(
    private readonly bucket: StorageContract,
    private readonly multipart: MultipartContract,
    private readonly storages: StorageRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const storage = await this.storages.findById(payload.id)

      if (!storage)
        return left(HTTPException.NotFound(this.i18n.t('files.not_found'), 'STORAGE_NOT_FOUND'))

      const file = storage.snapshot()
      const partSize = file.partSize ?? PART_SIZE
      const totalParts = countParts(file.size, partSize)
      const url = await this.bucket.signedUrl(file.path)

      // Already confirmed: nothing to upload. Return the same shape with empty
      // lists, not an error, because whoever asks is a resuming client -
      // it reads the `status` and stops, which is the right outcome.
      if (storage.isUploaded()) {
        return right(
          FilePresenter.upload({
            storage,
            url,
            uploadId: file.uploadId,
            partSize,
            totalParts,
            parts: [],
            uploaded: [],
          }),
        )
      }

      const uploaded = await this.uploaded(storage)
      const missing = pendingParts({
        totalParts,
        uploaded: uploaded.map((part) => part.partNumber),
        batch: PRESIGNED_BATCH,
      })
      const parts = await this.sign(storage, sizedParts(missing, file.size, partSize))

      return right(
        FilePresenter.upload({
          storage,
          url,
          uploadId: file.uploadId,
          partSize,
          totalParts,
          parts,
          uploaded,
        }),
      )
    } catch (error) {
      logger.error({ err: error }, '[storages/files > parts][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STORAGES_FILE_PARTS_ERROR',
        ),
      )
    }
  }

  /**
   * What the bucket already has.
   *
   * In a multipart it is `ListParts`. In a single-part upload there are no parts to
   * list, and what answers the same question is the object itself existing: if the
   * `PUT` managed to complete, the file is there and only the confirmation is missing.
   */
  private async uploaded(storage: Storage): Promise<Array<UploadedPart>> {
    const { path, uploadId } = storage.snapshot()

    if (uploadId) return this.multipart.listParts(path, uploadId)

    try {
      const metadata = await this.bucket.metadata(path)

      return [{ partNumber: 1, size: metadata.contentLength, etag: metadata.etag ?? '' }]
    } catch {
      // The object does not yet exist in the bucket: nothing sent, nothing to resume.
      return []
    }
  }

  /** A new URL for each missing part - the old ones may have expired. */
  private async sign(
    storage: Storage,
    missing: ReadonlyArray<PartToSign>,
  ): Promise<Array<PresignedPart>> {
    if (missing.length === 0) return []

    const { path, uploadId, mimetype, size } = storage.snapshot()

    if (uploadId) return this.multipart.signParts(path, uploadId, missing)

    return [{ partNumber: 1, url: await this.multipart.signSingle(path, mimetype, size) }]
  }
}
