import type { I18n } from '@adonisjs/i18n'

import { RefusalBase, type RefusalTable } from '#features/_shared.refusal.base'
import HTTPException from '#exceptions/http.exception'
import type { PhotoError } from '#domain/photo/photo.errors'

/**
 * Each refusal of the photo as an HTTP response, the same in the panel submission and in the
 * advisor one (`_standards/domain.md` §2). Table by `code`: a new fact without an
 * entry does not compile.
 */
export class PhotoRefusal extends RefusalBase {
  private static readonly TABLE = {
    PHOTO_NOT_IMAGE: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(i18n.t('photos.not_image'), 'PHOTO_NOT_IMAGE', {
        storageId: i18n.t('photos.not_image_field'),
      }),
  } satisfies RefusalTable<PhotoError>

  static http(error: PhotoError, i18n: I18n): HTTPException {
    return PhotoRefusal.translate(PhotoRefusal.TABLE, error.code, error, i18n)
  }

  /** The submission file does not exist, did not finish uploading or was archived. */
  static storageNotFound(i18n: I18n): HTTPException {
    return HTTPException.UnprocessableEntity(
      i18n.t('photos.storage_not_found'),
      'STORAGE_NOT_FOUND',
      { storageId: i18n.t('photos.storage_not_found') },
    )
  }
}
