import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type Merge,
  type StoragesFileShowResponse,
} from '@interclasse/shared'

import { FileRefusal } from '../_shared.file-refusal.ts'

import type { Storage } from '#domain/storage/storage.entity'
import HTTPException from '#exceptions/http.exception'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import { MultipartContract } from '#services/multipart/multipart.contract'
import type { IdentifierPayload } from '#core/validator'
import type { StoragesFileCompletePayload } from '#validators/storages/files.validator'

type Payload = Merge<IdentifierPayload, StoragesFileCompletePayload>
type Response = Either<HTTPException, StoragesFileShowResponse>

/**
 * Closes the upload: reassembles the parts in the bucket and marks the row as `UPLOADED`.
 *
 * This is where "declared" becomes "verified". `POST /storages` trusted the
 * size the client reported - it had no way not to, since the
 * bytes do not pass through here -, and this endpoint compares what
 * **actually** arrived with what was promised (entity rule). If it diverges: the
 * object is deleted, the row dies with it, and the response is `422`.
 *
 * The `mimetype` is not checked because it cannot diverge: it goes into the
 * URL signature, and the bucket refuses a `PUT` whose `Content-Type` does not match
 * what was signed. The size, that one does not - and so it is what
 * checked.
 *
 * Calling twice is safe. A client that lost the response to a network
 * drop resends the confirmation, and the second returns the same record instead of
 * an "upload already closed" error that would help nobody.
 */
@inject()
export default class StoragesFileCompleteUseCase {
  constructor(
    private readonly bucket: StorageContract,
    private readonly multipart: MultipartContract,
    private readonly storages: StorageRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const storage = await this.storages.findById(payload.id)

      if (!storage) return left(this.notFound())

      if (!storage.isUploaded()) {
        const { path, uploadId } = storage.snapshot()

        if (uploadId) await this.multipart.complete(path, uploadId, payload.parts ?? [])

        const metadata = await this.bucket.metadata(path)
        const head = await this.bucket.head(path)
        const completed = storage.complete(
          { contentLength: metadata.contentLength, head },
          new Date(),
        )

        if (completed.isLeft()) {
          await this.discard(storage)

          return left(FileRefusal.http(completed.value, this.i18n))
        }

        await this.storages.save(storage)
      }

      const detail = await this.storages.detail(storage.id)

      if (!detail) return left(this.notFound())

      return right(await this.bucket.withUrl(detail))
    } catch (error) {
      logger.error({ err: error }, '[storages/files > complete][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STORAGES_FILE_COMPLETE_ERROR',
        ),
      )
    }
  }

  /**
   * Deletes what was uploaded wrong, binary and row.
   *
   * The row dies with it because it no longer describes anything: a `PENDING` whose
   * object was deleted can never be confirmed, and would stay forever
   * occupying an id that someone might try to attach.
   */
  private async discard(storage: Storage): Promise<void> {
    try {
      await this.bucket.discard(storage.snapshot().path)
      await this.storages.delete(storage)
    } catch (error) {
      logger.error({ err: error }, '[storages/files > complete][discard][error]')
    }
  }

  private notFound(): HTTPException {
    return HTTPException.NotFound(this.i18n.t('files.not_found'), 'STORAGE_NOT_FOUND')
  }
}
