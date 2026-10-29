import type { I18n } from '@adonisjs/i18n'

import HTTPException from '#exceptions/http.exception'
import type { StorageError } from '#domain/storage/storage.errors'

/**
 * Cada recusa do arquivo como resposta HTTP, a mesma na confirmação e na
 * exclusão (`_standards/domain.md` §2). `switch` sobre o `code` declarado: o
 * fato que carrega dado chega estreitado, e o `never` do fim faz o compilador
 * apontar fato novo sem tradução.
 */
export class FileRefusal {
  static http(error: StorageError, i18n: I18n): HTTPException {
    switch (error.code) {
      case 'STORAGE_SIZE_MISMATCH':
        return HTTPException.UnprocessableEntity(
          i18n.t('files.incomplete'),
          'STORAGE_SIZE_MISMATCH',
          {
            size: i18n.t('files.size_mismatch_field', {
              received: String(error.received),
              declared: String(error.declared),
            }),
          },
        )
      case 'STORAGE_IN_USE':
        return HTTPException.Conflict(i18n.t('files.in_use'), 'STORAGE_IN_USE', {
          id: i18n.t('files.in_use_field', { places: error.usedBy.join(', ') }),
        })
      default:
        return FileRefusal.unreachable(error)
    }
  }

  private static unreachable(error: never): never {
    throw new Error(`Recusa de arquivo sem tradução: ${JSON.stringify(error)}`)
  }
}
