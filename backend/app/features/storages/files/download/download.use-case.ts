import { inject } from '@adonisjs/core'
import { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@interclasse/shared'

import HTTPException from '#exceptions/http.exception'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { StorageContract } from '#services/storage/storage.contract'
import type { IdentifierPayload } from '#core/validator'

type Payload = IdentifierPayload
type Response = Either<HTTPException, string>

/**
 * Where to send whoever clicked "save file".
 *
 * It exists because of a browser limitation, not a storage one: the `download` attribute
 * of an `<a>` is **ignored across origins**, and the API answers on an origin
 * different from the app. Without this route, the click would open the image in a tab and the
 * file would arrive with the uuid as its name.
 *
 * Returns a signed URL instead of serving the binary. The `Content-Disposition`
 * with the original name travels signed inside it, and it is the bucket that returns it -
 * the application hands out an address and gets out of the way, instead of being busy
 * for the duration of each download transfer.
 *
 * Opens by `id` and not by `path` because the original name lives in the `storages`
 * row - it is what the header carries.
 *
 * Requires a session. It used to be anonymous, and with the bucket already private that meant
 * anyone with an object's uuid received a signed URL for it.
 * Closing the bucket without closing this route closed nothing.
 */
@inject()
export default class StoragesFileDownloadUseCase {
  constructor(
    private readonly bucket: StorageContract,
    private readonly storages: StorageRepository,
    private readonly i18n: I18n,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const storage = await this.storages.findById(payload.id)

      if (!storage)
        return left(HTTPException.NotFound(this.i18n.t('files.not_found'), 'STORAGE_NOT_FOUND'))

      const { path, mimetype, originalName } = storage.snapshot()

      return right(await this.bucket.signedDownload({ path, mimetype, originalName }))
    } catch (error) {
      logger.error({ err: error }, '[storages/files > download][error]')

      return left(
        HTTPException.InternalServerError(
          this.i18n.t('errors.internal'),
          'STORAGES_FILE_DOWNLOAD_ERROR',
        ),
      )
    }
  }
}
