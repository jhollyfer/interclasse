import { BasePolicy, AuthorizationResponse } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { USER_ROLE } from '@interclasse/shared'

import type Classroom from '#models/classroom'
import type User from '#models/user'

/**
 * Quem cuida de qual turma.
 *
 * O `role.middleware` deixa o conselheiro entrar em `/advisor`, mas não sabe
 * **qual** turma é dele - a regra depende do alvo, e por isso mora aqui. O
 * administrador cuida de todas: é ele quem corrige a lista quando o conselheiro
 * falta.
 *
 * A negação é `404`, e não `403`: dizer "proibido" confirmaria que a turma de
 * outro conselheiro existe. Pelo mesmo motivo a turma ausente (`null`) cai na
 * mesma resposta - quem pergunta não distingue as duas.
 *
 * O representante não passa por aqui: a turma dele sai da sessão, e não há alvo
 * a conferir.
 */
export default class ClassroomPolicy extends BasePolicy {
  manage(actor: User, classroom: Classroom | null): AuthorizerResponse {
    if (classroom && actor.role === USER_ROLE.ADMINISTRATOR) return true
    if (classroom && classroom.advisorId === actor.id) return true

    return AuthorizationResponse.deny('Turma não encontrada', 404).t('CLASSROOM_NOT_FOUND')
  }

  /** O aluno é alcançado pela turma dele; ausente ou alheio, `404` do aluno. */
  manageStudent(
    actor: User,
    student: { readonly classroom: Classroom } | null,
  ): AuthorizerResponse {
    if (student && actor.role === USER_ROLE.ADMINISTRATOR) return true
    if (student && student.classroom.advisorId === actor.id) return true

    return AuthorizationResponse.deny('Aluno não encontrado', 404).t('STUDENT_NOT_FOUND')
  }
}
