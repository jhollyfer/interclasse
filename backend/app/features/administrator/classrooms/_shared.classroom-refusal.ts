import type { I18n } from '@adonisjs/i18n'

import { RefusalBase, type RefusalTable } from '#features/_shared.refusal.base'
import HTTPException from '#exceptions/http.exception'
import type { ClassroomError } from '#domain/classroom/classroom.errors'

/**
 * Each refusal of the classroom as an HTTP response, the same in the registration, the edit and the
 * deletion (`_standards/domain.md` §2). Table by `code`: a new fact without an entry
 * does not compile. The 409 of the repeated name and the one of the taken links are the same for the
 * check before saving and the race on the `unique`, which the repository
 * returns as a fact.
 */
export class ClassroomRefusal extends RefusalBase {
  private static readonly TABLE = {
    CLASSROOM_INVALID_GRADE: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(
        i18n.t('classrooms.invalid_grade'),
        'CLASSROOM_INVALID_GRADE',
        { grade: i18n.t('classrooms.invalid_grade_field') },
      ),
    CLASSROOM_CATEGORY_LOCKED: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('classrooms.in_competition'), 'CLASSROOM_IN_COMPETITION', {
        grade: i18n.t('classrooms.category_locked_field'),
      }),
    CLASSROOM_IN_COMPETITION: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('classrooms.in_competition'), 'CLASSROOM_IN_COMPETITION'),
    CLASSROOM_ALREADY_EXISTS: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('classrooms.already_exists'), 'CLASSROOM_ALREADY_EXISTS', {
        name: i18n.t('classrooms.name_taken'),
      }),
    ADVISOR_NOT_FOUND: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(
        i18n.t('classrooms.advisor_not_found'),
        'ADVISOR_NOT_FOUND',
        { advisorId: i18n.t('classrooms.advisor_not_found_field') },
      ),
    ADVISOR_TAKEN: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('classrooms.advisor_taken'), 'ADVISOR_TAKEN', {
        advisorId: i18n.t('classrooms.advisor_taken_field'),
      }),
    REPRESENTATIVE_NOT_FOUND: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(
        i18n.t('classrooms.representative_not_found'),
        'REPRESENTATIVE_NOT_FOUND',
        { representativeId: i18n.t('classrooms.representative_not_found_field') },
      ),
    REPRESENTATIVE_TAKEN: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('classrooms.representative_taken'), 'REPRESENTATIVE_TAKEN', {
        representativeId: i18n.t('classrooms.representative_taken_field'),
      }),
  } satisfies RefusalTable<ClassroomError>

  static http(error: ClassroomError, i18n: I18n): HTTPException {
    return ClassroomRefusal.translate(ClassroomRefusal.TABLE, error.code, error, i18n)
  }
}
