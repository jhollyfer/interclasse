import type Classroom from '#models/classroom'
import type User from '#models/user'
import { UserRoles } from '#core/entity'

/**
 * Quem cuida de qual turma.
 *
 * O `role_middleware` deixa o conselheiro entrar em `/advisor`, mas não sabe
 * **qual** turma é dele - a regra depende do alvo, e por isso mora aqui. O
 * administrador cuida de todas: é ele quem corrige a lista quando o conselheiro
 * falta.
 *
 * O representante não passa por aqui: a turma dele sai da sessão, e não há alvo
 * a conferir.
 */
export default class ClassroomPolicy {
  manage(actor: User, classroom: Classroom): boolean {
    if (actor.role === UserRoles.ADMINISTRATOR) return true

    return classroom.advisorId === actor.id
  }
}
