import type { I18n } from '@adonisjs/i18n'

import HTTPException from '#exceptions/http.exception'
import type { EnrollmentError } from '#domain/enrollment/enrollment.errors'

/**
 * Cada recusa da lista de atletas como resposta HTTP, a mesma para o conselheiro
 * e para o representante: a regra escrita duas vezes divergiria, e a divergência
 * seria um representante conseguindo o que o conselheiro não consegue
 * (`_standards/domain.md` §2). `switch` sobre o `code` declarado: o `never` do
 * fim faz o compilador apontar fato novo sem tradução.
 */
export class EnrollmentRefusal {
  static http(error: EnrollmentError, i18n: I18n): HTTPException {
    switch (error.code) {
      case 'ENROLLMENT_LIMIT_EXCEEDED':
        return HTTPException.UnprocessableEntity(
          i18n.t('enrollments.limit_exceeded'),
          'ENROLLMENT_LIMIT_EXCEEDED',
          { studentIds: i18n.t('enrollments.limit_exceeded_field', { max: error.maxAthletes }) },
        )
      case 'ENROLLMENT_STUDENT_NOT_IN_CLASSROOM':
        return HTTPException.UnprocessableEntity(
          i18n.t('enrollments.student_not_in_classroom'),
          'STUDENT_NOT_FOUND',
          { studentIds: i18n.t('enrollments.student_not_in_classroom_field') },
        )
      case 'ENROLLMENT_REMOVAL_FORBIDDEN':
        return HTTPException.Forbidden(
          i18n.t('enrollments.removal_forbidden'),
          'ENROLLMENT_REMOVAL_FORBIDDEN',
        )
      case 'ENROLLMENT_LOCKED':
        return HTTPException.Conflict(i18n.t('enrollments.locked'), 'ENROLLMENT_LOCKED')
      case 'ENROLLMENT_REASON_REQUIRED':
        return HTTPException.UnprocessableEntity(
          i18n.t('enrollments.reason_required'),
          'ENROLLMENT_REASON_REQUIRED',
          { reason: i18n.t('enrollments.reason_required_field') },
        )
      default:
        return EnrollmentRefusal.unreachable(error)
    }
  }

  /** A modalidade da lista não existe: não é regra da lista, é referência solta. */
  static sportNotFound(i18n: I18n): HTTPException {
    return HTTPException.UnprocessableEntity(
      i18n.t('enrollments.sport_not_found'),
      'SPORT_NOT_FOUND',
      { sportId: i18n.t('enrollments.sport_not_found') },
    )
  }

  private static unreachable(error: never): never {
    throw new Error(`Recusa de inscrição sem tradução: ${JSON.stringify(error)}`)
  }
}
