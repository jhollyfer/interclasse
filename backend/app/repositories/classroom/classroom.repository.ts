import type {
  Actor,
  AdministratorClassroomPaginateResponse,
  AdministratorClassroomShowResponse,
  Category,
  Either,
  Paginated,
  SortDirection,
} from '@interclasse/shared'

import type {
  Classroom,
  ClassroomLinks,
  ClassroomPeopleFacts,
} from '#domain/classroom/classroom.entity'
import type { ClassroomError } from '#domain/classroom/classroom.errors'

export type ClassroomListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly category?: Category
  readonly sort: 'name' | 'grade' | 'category' | 'createdAt'
  readonly direction: SortDirection
}

/** A lista do conselheiro: só as turmas do alcance dele, por nome. */
export type ClassroomOwnedListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly actor: Actor
}

/**
 * A persistência da turma, por intenção (`_standards/domain.md` §5.1). O escritor
 * único da tabela `classrooms`; lê `users` só para responder se a conta indicada
 * serve ao vínculo, e `teams` e `enrollments` para os totais e o sorteio.
 */
export abstract class ClassroomRepository {
  abstract findById(id: string): Promise<Classroom | null>
  /**
   * A turma ao alcance de quem age: o administrador alcança todas, o conselheiro
   * a dele. Turma alheia volta `null`, igual à inexistente (`backend.md` §4.6).
   */
  abstract findOwned(criteria: {
    readonly id: string
    readonly actor: Actor
  }): Promise<Classroom | null>
  /** A turma que a conta representa, que é uma só. */
  abstract findOfRepresentative(accountId: string): Promise<Classroom | null>
  /** Leitura leve: a turma com conselheiro e representante, direto da query. */
  abstract findDetail(id: string): Promise<AdministratorClassroomShowResponse | null>
  /** Outra turma, que não `exceptId`, já usa o nome. */
  abstract existsByName(name: string, exceptId?: string): Promise<boolean>
  /** Os fatos de cada conta indicada; conta ausente do critério fica sem fato. */
  abstract peopleFacts(
    links: ClassroomLinks,
    exceptClassroomId?: string,
  ): Promise<ClassroomPeopleFacts>
  /** A turma já tem time numa chave sorteada. */
  abstract isInCompetition(id: string): Promise<boolean>
  /**
   * Grava a turma; a corrida no `unique` volta como o fato do campo que colidiu: o nome,
   * o conselheiro ou o representante.
   */
  abstract save(classroom: Classroom): Promise<Either<ClassroomError, void>>
  abstract delete(classroom: Classroom): Promise<void>
  /**
   * Desfaz os vínculos de turma de uma conta que deixou de ser o que era (papel
   * mudou ou foi arquivada). Arquivar é remoção lógica, então o `ON DELETE SET
   * NULL` da coluna nunca dispara: quem faz o papel dele é este método.
   */
  abstract detachAccount(accountId: string): Promise<void>
  abstract paginate(
    criteria: ClassroomListCriteria,
  ): Promise<Paginated<AdministratorClassroomPaginateResponse>>
  abstract paginateOwned(
    criteria: ClassroomOwnedListCriteria,
  ): Promise<Paginated<AdministratorClassroomShowResponse>>
}
