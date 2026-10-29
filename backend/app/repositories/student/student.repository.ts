import type { Actor, AdvisorStudentShowResponse, Paginated } from '@interclasse/shared'

import type { Student } from '#domain/student/student.entity'

export type StudentListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly classroomId?: string
  readonly actor: Actor
}

/**
 * A persistência do aluno, por intenção (`_standards/domain.md` §5.1). O escritor
 * único da tabela `students`; lê `classrooms`, `enrollments` e `brackets` só para
 * responder o alcance de quem age e o que o sorteio já travou.
 */
export abstract class StudentRepository {
  /**
   * O aluno de uma turma ao alcance de quem age: o administrador alcança todas, o
   * conselheiro a dele. Aluno alheio volta `null`, igual ao inexistente
   * (`backend.md` §4.6).
   */
  abstract findOwned(criteria: {
    readonly id: string
    readonly actor: Actor
  }): Promise<Student | null>
  /** O aluno está inscrito numa modalidade já sorteada na categoria da turma dele. */
  abstract isInDrawnSport(studentId: string): Promise<boolean>
  abstract save(student: Student): Promise<void>
  abstract delete(student: Student): Promise<void>
  /** Leitura leve: a forma da resposta direto da query, sem hidratar entidade. */
  abstract paginate(criteria: StudentListCriteria): Promise<Paginated<AdvisorStudentShowResponse>>
}
