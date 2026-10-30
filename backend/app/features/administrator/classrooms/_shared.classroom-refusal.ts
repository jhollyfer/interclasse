import type { I18n } from '@adonisjs/i18n'

import { RefusalBase, type RefusalTable } from '#features/_shared.refusal.base'
import HTTPException from '#exceptions/http.exception'
import type { ClassroomError } from '#domain/classroom/classroom.errors'

/**
 * Cada recusa da turma como resposta HTTP, a mesma no cadastro, na edição e na
 * exclusão (`_standards/domain.md` §2). Tabela por `code`: fato novo sem entrada
 * não compila. O 409 do nome repetido e o dos vínculos tomados são o mesmo da
 * checagem antes de gravar e o da corrida no `unique`, que o repository
 * devolve como fato.
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
