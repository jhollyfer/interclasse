import type { I18n } from '@adonisjs/i18n'

import { RefusalBase, type RefusalTable } from '#features/_shared.refusal.base'
import HTTPException from '#exceptions/http.exception'
import type { StorageError } from '#domain/storage/storage.errors'

/** Each refusal of the file as an HTTP response (`_standards/domain.md` §2). */
export class FileRefusal extends RefusalBase {
  private static readonly TABLE = {
    STORAGE_SIZE_MISMATCH: (fact, i18n) =>
      HTTPException.UnprocessableEntity(i18n.t('files.incomplete'), 'STORAGE_SIZE_MISMATCH', {
        size: i18n.t('files.size_mismatch_field', {
          received: String(fact.received),
          declared: String(fact.declared),
        }),
      }),
    STORAGE_CONTENT_MISMATCH: (fact, i18n) =>
      HTTPException.UnprocessableEntity(i18n.t('files.incomplete'), 'STORAGE_CONTENT_MISMATCH', {
        mimetype: i18n.t('files.content_mismatch_field', { mimetype: fact.mimetype }),
      }),
    STORAGE_IN_USE: (fact, i18n) =>
      HTTPException.Conflict(i18n.t('files.in_use'), 'STORAGE_IN_USE', {
        id: i18n.t('files.in_use_field', { places: fact.usedBy.join(', ') }),
      }),
  } satisfies RefusalTable<StorageError>

  static http(error: StorageError, i18n: I18n): HTTPException {
    return FileRefusal.translate(FileRefusal.TABLE, error.code, error, i18n)
  }

  /**
   * Attaching a file that does not exist, was removed or is still `PENDING` is
   * `422` pointing at the field, never `404` nor `500`, because whoever sent the wrong
   * id was the payload. It holds for every resource that attaches a file.
   */
  static attachmentNotFound(field: string, i18n: I18n): HTTPException {
    return HTTPException.UnprocessableEntity(i18n.t('files.not_found'), 'STORAGE_NOT_FOUND', {
      [field]: i18n.t('files.not_found'),
    })
  }
}
