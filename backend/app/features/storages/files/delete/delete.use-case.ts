import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import { FileRefusal } from '../_shared.file-refusal.ts'

import type { Storage } from '#domain/storage/storage.entity'
import HTTPException from '#exceptions/http.exception'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import { MultipartContract } from '#services/multipart/multipart.contract'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Deletes an orphan file: the binary in the bucket and the row in `storages`.
 *
 * It exists to close the hole that the upload opens. `POST /storages` registers the
 * file **before** the form is saved (which avoids a payload that
 * references a file that failed to upload), so every attachment chosen and
 * then removed from the screen would stay in the bucket forever.
 *
 * It serves both states. `PENDING` is an upload in progress, and deleting it is
 * **cancelling**: the multipart is aborted, and that is what makes the parts already sent
 * disappear. Without the abort they hang forever - they do not show up in the
 * object listing, and keep being billed. `UPLOADED` is the finished
 * file, and then the entity reference rule applies.
 *
 * **Only deletes what nobody uses.** `storages` is a neutral, shared record
 * - the file does not belong to the form that submitted it -, so ownership does not
 * serve as authorization: whoever knew a uuid would puncture another user's
 * avatar. Referenced is `409`, and the message says where.
 */
@inject()
export default class StoragesFileDeleteUseCase {
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

      const removable = storage.remove(await this.storages.usedBy(storage.id))

      if (removable.isLeft()) return left(FileRefusal.http(removable.value, this.i18n))

      if (storage.isPending()) await this.cancel(storage)
      else await this.bucket.discard(storage.snapshot().path)

      await this.storages.delete(storage)

      return right(null)
    } catch (error) {
      logger.error({ err: error }, '[storages/files > delete][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STORAGES_FILE_DELETE_ERROR',
        ),
      )
    }
  }

  /**
   * Cancels an upload in progress.
   *
   * The final object does not exist yet - the parts live under the `uploadId`, and it is the
   * abort that discards them. In a single-part upload there is no abort, and what
   * may exist is the whole object, when the `PUT` managed to complete before the
   * cancellation; deleting it may find nothing, and finding nothing is the
   * common one.
   */
  private async cancel(storage: Storage): Promise<void> {
    const { path, uploadId } = storage.snapshot()

    if (uploadId) {
      await this.multipart.abort(path, uploadId)
      return
    }

    try {
      await this.bucket.discard(path)
    } catch {
      // Not finding the object is the common case, and it is the result that was wanted.
    }
  }
}
