import type { I18n } from '@adonisjs/i18n'

import { RefusalBase, type RefusalTable } from '#features/_shared.refusal.base'
import HTTPException from '#exceptions/http.exception'
import type { EnrollmentError } from '#domain/enrollment/enrollment.errors'

/**
 * Each refusal of the athlete list as an HTTP response, the same for the advisor
 * and the representative: the rule written twice would diverge, and the divergence
 * would be a representative getting what the advisor cannot
 * (`_standards/domain.md` §2). Table by `code`: a new fact without an entry does not
 * compile.
 */
export class EnrollmentRefusal extends RefusalBase {
  private static readonly TABLE = {
    ENROLLMENT_LIMIT_EXCEEDED: (fact, i18n) =>
      HTTPException.UnprocessableEntity(
        i18n.t('enrollments.limit_exceeded'),
        'ENROLLMENT_LIMIT_EXCEEDED',
        { studentIds: i18n.t('enrollments.limit_exceeded_field', { max: fact.maxAthletes }) },
      ),
    ENROLLMENT_STUDENT_NOT_IN_CLASSROOM: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(
        i18n.t('enrollments.student_not_in_classroom'),
        'STUDENT_NOT_FOUND',
        { studentIds: i18n.t('enrollments.student_not_in_classroom_field') },
      ),
    ENROLLMENT_REMOVAL_FORBIDDEN: (_fact, i18n) =>
      HTTPException.Forbidden(
        i18n.t('enrollments.removal_forbidden'),
        'ENROLLMENT_REMOVAL_FORBIDDEN',
      ),
    ENROLLMENT_LOCKED: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('enrollments.locked'), 'ENROLLMENT_LOCKED'),
    ENROLLMENT_REASON_REQUIRED: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(
        i18n.t('enrollments.reason_required'),
        'ENROLLMENT_REASON_REQUIRED',
        { reason: i18n.t('enrollments.reason_required_field') },
      ),
  } satisfies RefusalTable<EnrollmentError>

  static http(error: EnrollmentError, i18n: I18n): HTTPException {
    return EnrollmentRefusal.translate(EnrollmentRefusal.TABLE, error.code, error, i18n)
  }

  /** The sport of the list does not exist: not a list rule, a dangling reference. */
  static sportNotFound(i18n: I18n): HTTPException {
    return HTTPException.UnprocessableEntity(
      i18n.t('enrollments.sport_not_found'),
      'SPORT_NOT_FOUND',
      { sportId: i18n.t('enrollments.sport_not_found') },
    )
  }
}
