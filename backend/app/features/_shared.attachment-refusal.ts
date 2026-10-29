import type { I18n } from '@adonisjs/i18n'

import HTTPException from '#exceptions/http.exception'

/**
 * A recusa de anexar um arquivo que não existe, foi removido ou ainda está
 * `PENDING`: é `422` apontando o campo, nunca `404` nem `500`, porque quem
 * mandou o id errado foi o payload. Vale para todo recurso que anexa arquivo.
 */
export class AttachmentRefusal {
  static notFound(field: string, i18n: I18n): HTTPException {
    return HTTPException.UnprocessableEntity(i18n.t('files.not_found'), 'STORAGE_NOT_FOUND', {
      [field]: i18n.t('files.not_found'),
    })
  }
}
