import type { I18n } from '@adonisjs/i18n'

import HTTPException from '#exceptions/http.exception'
import { violatedConstraint } from '#features/_shared.database'
import type { ClassroomError } from '#domain/classroom/classroom.errors'

/**
 * Cada recusa da turma como resposta HTTP, a mesma no cadastro, na edição e na
 * exclusão (`_standards/domain.md` §2). `switch` sobre o `code` declarado: o
 * `never` do fim faz o compilador apontar fato novo sem tradução.
 */
export class ClassroomRefusal {
  static http(error: ClassroomError, i18n: I18n): HTTPException {
    switch (error.code) {
      case 'CLASSROOM_INVALID_GRADE':
        return HTTPException.UnprocessableEntity(
          i18n.t('classrooms.invalid_grade'),
          'CLASSROOM_INVALID_GRADE',
          { grade: i18n.t('classrooms.invalid_grade_field') },
        )
      case 'CLASSROOM_CATEGORY_LOCKED':
        return HTTPException.Conflict(
          i18n.t('classrooms.in_competition'),
          'CLASSROOM_IN_COMPETITION',
          { grade: i18n.t('classrooms.category_locked_field') },
        )
      case 'CLASSROOM_IN_COMPETITION':
        return HTTPException.Conflict(
          i18n.t('classrooms.in_competition'),
          'CLASSROOM_IN_COMPETITION',
        )
      case 'ADVISOR_NOT_FOUND':
        return HTTPException.UnprocessableEntity(
          i18n.t('classrooms.advisor_not_found'),
          'ADVISOR_NOT_FOUND',
          { advisorId: i18n.t('classrooms.advisor_not_found_field') },
        )
      case 'ADVISOR_TAKEN':
        return HTTPException.Conflict(i18n.t('classrooms.advisor_taken'), 'ADVISOR_TAKEN', {
          advisorId: i18n.t('classrooms.advisor_taken_field'),
        })
      case 'REPRESENTATIVE_NOT_FOUND':
        return HTTPException.UnprocessableEntity(
          i18n.t('classrooms.representative_not_found'),
          'REPRESENTATIVE_NOT_FOUND',
          { representativeId: i18n.t('classrooms.representative_not_found_field') },
        )
      case 'REPRESENTATIVE_TAKEN':
        return HTTPException.Conflict(
          i18n.t('classrooms.representative_taken'),
          'REPRESENTATIVE_TAKEN',
          { representativeId: i18n.t('classrooms.representative_taken_field') },
        )
      default:
        return ClassroomRefusal.unreachable(error)
    }
  }

  /** O 409 do nome repetido, a mesma resposta da checagem antes de gravar e da corrida. */
  static alreadyExists(i18n: I18n): HTTPException {
    return HTTPException.Conflict(i18n.t('classrooms.already_exists'), 'CLASSROOM_ALREADY_EXISTS', {
      name: i18n.t('classrooms.name_taken'),
    })
  }

  /**
   * A corrida que a checagem antes de gravar não fecha: o segundo pedido esbarra
   * num `unique` do banco, e cada um vira o 409 do campo dele. O nome da turma é o
   * que sobra. O nome do `unique` é o que a migration deu a ele.
   */
  static race(error: unknown, i18n: I18n): HTTPException {
    switch (violatedConstraint(error)) {
      case 'classrooms_advisor_id_unique':
        return ClassroomRefusal.http({ code: 'ADVISOR_TAKEN' }, i18n)
      case 'classrooms_representative_id_unique':
        return ClassroomRefusal.http({ code: 'REPRESENTATIVE_TAKEN' }, i18n)
      default:
        return ClassroomRefusal.alreadyExists(i18n)
    }
  }

  private static unreachable(error: never): never {
    throw new Error(`Recusa de turma sem tradução: ${JSON.stringify(error)}`)
  }
}
