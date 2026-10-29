import type { I18n } from '@adonisjs/i18n'

import HTTPException from '#exceptions/http.exception'
import type { StudentError } from '#domain/student/student.errors'

/**
 * Cada recusa do aluno como resposta HTTP (`_standards/domain.md` §2). `switch`
 * sobre o `code` declarado: o `never` do fim faz o compilador apontar fato novo
 * sem tradução.
 */
export class StudentRefusal {
  static http(error: StudentError, i18n: I18n): HTTPException {
    switch (error.code) {
      case 'STUDENT_NAME_EMPTY':
        return HTTPException.UnprocessableEntity(
          i18n.t('students.name_empty'),
          'STUDENT_NAME_EMPTY',
          { name: i18n.t('students.name_empty') },
        )
      case 'STUDENT_IN_COMPETITION':
        return HTTPException.Conflict(i18n.t('students.in_competition'), 'STUDENT_IN_COMPETITION')
      default:
        return StudentRefusal.unreachable(error)
    }
  }

  private static unreachable(error: never): never {
    throw new Error(`Recusa de aluno sem tradução: ${JSON.stringify(error)}`)
  }
}
