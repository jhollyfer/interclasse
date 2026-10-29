import type { I18n } from '@adonisjs/i18n'

import HTTPException from '#exceptions/http.exception'
import type { PhotoError } from '#domain/photo/photo.errors'

/**
 * Cada recusa da foto como resposta HTTP, a mesma no envio do painel e no do
 * conselheiro (`_standards/domain.md` §2). O `never` do fim faz o compilador
 * apontar fato novo sem tradução.
 */
export class PhotoRefusal {
  static http(error: PhotoError, i18n: I18n): HTTPException {
    switch (error.code) {
      case 'PHOTO_NOT_IMAGE':
        return HTTPException.UnprocessableEntity(i18n.t('photos.not_image'), 'PHOTO_NOT_IMAGE', {
          storageId: i18n.t('photos.not_image_field'),
        })
      default:
        return PhotoRefusal.unreachable(error.code)
    }
  }

  /** O arquivo do envio não existe, não terminou de subir ou foi arquivado. */
  static storageNotFound(i18n: I18n): HTTPException {
    return HTTPException.UnprocessableEntity(
      i18n.t('photos.storage_not_found'),
      'STORAGE_NOT_FOUND',
      { storageId: i18n.t('photos.storage_not_found') },
    )
  }

  private static unreachable(code: never): never {
    throw new Error(`Recusa de foto sem tradução: ${JSON.stringify(code)}`)
  }
}
