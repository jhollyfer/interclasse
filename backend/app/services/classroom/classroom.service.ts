import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import Classroom from '#models/classroom'
import User from '#models/user'
import { left, right, type Either } from '#core/either'
import HTTPException from '#exceptions/http.exception'
import { UserRoles, type UserRole } from '#core/entity'

type People = { advisorId?: string | null; representativeId?: string | null }

/**
 * Os vínculos de pessoa de uma turma: conselheiro e representante.
 *
 * Service porque consulta o banco, e um só para `create` e `update` - os dois
 * recebem os mesmos campos e precisam recusar as mesmas coisas.
 */
export default class ClassroomService {
  /**
   * Confere que cada conta indicada existe, está viva e tem o papel do vínculo.
   *
   * Sem a checagem de papel, um representante indicado como conselheiro
   * ganharia o cadastro de alunos da turma inteira.
   *
   * `current` é a turma sendo editada: o representante só pode ter uma turma,
   * e a própria não conta como conflito.
   */
  async assertPeople(people: People, current?: Classroom): Promise<Either<HTTPException, true>> {
    // Na edição só se confere o vínculo que mudou: o que já estava gravado foi
    // aceito quando entrou, e recusá-lo agora travaria até renomear a turma.
    const classroomId = current?.id
    if (people.advisorId && people.advisorId !== current?.advisorId) {
      const advisor = await this.person(people.advisorId, UserRoles.ADVISOR)

      if (!advisor)
        return left(
          HTTPException.UnprocessableEntity('Conselheiro não encontrado', 'ADVISOR_NOT_FOUND', {
            advisorId: 'Selecione um professor conselheiro',
          }),
        )
    }

    if (people.representativeId && people.representativeId !== current?.representativeId) {
      const representative = await this.person(people.representativeId, UserRoles.REPRESENTATIVE)

      if (!representative)
        return left(
          HTTPException.UnprocessableEntity(
            'Representante não encontrado',
            'REPRESENTATIVE_NOT_FOUND',
            { representativeId: 'Selecione um aluno representante' },
          ),
        )

      const taken = Classroom.query().where('representativeId', people.representativeId)
      if (classroomId) taken.whereNot('id', classroomId)

      if (await taken.first())
        return left(
          HTTPException.Conflict(
            'Representante já vinculado a outra turma',
            'REPRESENTATIVE_TAKEN',
            { representativeId: 'Este representante já está em outra turma' },
          ),
        )
    }

    return right(true)
  }

  /**
   * Desfaz os vínculos de turma de uma conta que deixou de ser o que era: o
   * papel mudou, ou ela foi arquivada. Sem isto a turma continuaria apontando
   * para quem não aconselha nem representa mais, e a conta recuperaria o
   * escopo antigo se o papel voltasse.
   *
   * Arquivar é remoção lógica, então o `ON DELETE SET NULL` da coluna nunca
   * dispara - quem faz o papel dele é este método.
   */
  async detach(user: User, client: TransactionClientContract): Promise<void> {
    await Classroom.query({ client }).where('advisorId', user.id).update({ advisorId: null })
    await Classroom.query({ client })
      .where('representativeId', user.id)
      .update({ representativeId: null })
  }

  private person(id: string, role: UserRole): Promise<User | null> {
    return User.query()
      .where('id', id)
      .where('role', role)
      .withScopes((scopes) => scopes.notDeleted())
      .first()
  }
}
