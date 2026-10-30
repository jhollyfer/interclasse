import type { I18n } from '@adonisjs/i18n'

import { RefusalBase, type RefusalTable } from '#features/_shared.refusal.base'
import HTTPException from '#exceptions/http.exception'
import type { StudentError } from '#domain/student/student.errors'

/** Cada recusa do aluno como resposta HTTP (`_standards/domain.md` §2). */
export class StudentRefusal extends RefusalBase {
  private static readonly TABLE = {
    STUDENT_NAME_EMPTY: (_fact, i18n) =>
      HTTPException.UnprocessableEntity(i18n.t('students.name_empty'), 'STUDENT_NAME_EMPTY', {
        name: i18n.t('students.name_empty'),
      }),
    STUDENT_IN_COMPETITION: (_fact, i18n) =>
      HTTPException.Conflict(i18n.t('students.in_competition'), 'STUDENT_IN_COMPETITION'),
  } satisfies RefusalTable<StudentError>

  static http(error: StudentError, i18n: I18n): HTTPException {
    return StudentRefusal.translate(StudentRefusal.TABLE, error.code, error, i18n)
  }
}
