import type { AdvisorEnrollmentShowResponse } from '@interclasse/shared'

import type { Enrollment } from '#domain/enrollment/enrollment.entity'

/** O que a lista precisa saber da modalidade: o teto de atletas. */
export type EnrollmentSport = {
  readonly id: string
  readonly maxAthletes: number
}

/** Um aluno da turma: o id para a lista e o nome para o aviso de remoção. */
export type EnrollmentStudent = {
  readonly id: string
  readonly name: string
}

/** A lista de uma turma numa modalidade. */
export type EnrollmentKey = {
  readonly classroomId: string
  readonly sportId: string
}

/**
 * A persistência da lista de atletas, por intenção (`_standards/domain.md` §5.1).
 * O escritor único da tabela `enrollments`; lê `sports`, `students`, `classrooms`
 * e `brackets` só para responder o que a regra da lista pergunta.
 */
export abstract class EnrollmentRepository {
  abstract findSport(sportId: string): Promise<EnrollmentSport | null>
  /** Os alunos da turma, por nome. */
  abstract studentsOf(classroomId: string): Promise<EnrollmentStudent[]>
  /** A modalidade já foi sorteada na categoria da turma. */
  abstract isDrawn(key: EnrollmentKey): Promise<boolean>
  /**
   * A lista atual, depois de travar a linha da modalidade. A mesma trava do
   * sorteio: a checagem do sorteio só vale depois dela, porque lida antes a lista
   * podia ser gravada depois de a chave ser fechada (`backend.md` §4.11). Só
   * dentro de uma unidade de trabalho.
   */
  abstract findForUpdate(key: EnrollmentKey): Promise<Enrollment>
  /** Troca a lista gravada da turma nesta modalidade pela da entidade. */
  abstract save(enrollment: Enrollment): Promise<void>
  /**
   * A matriz aluno x modalidade da turma, direto da query. `lockAfterDraw` é o
   * que diferencia as duas telas: só a do representante trava na modalidade
   * sorteada. `null` quando a turma não existe.
   */
  abstract board(criteria: {
    readonly classroomId: string
    readonly lockAfterDraw: boolean
  }): Promise<AdvisorEnrollmentShowResponse | null>
}
