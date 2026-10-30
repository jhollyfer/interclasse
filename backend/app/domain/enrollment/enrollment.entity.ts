import { left, right, type Either } from '@interclasse/shared'

import type { EnrollmentError } from './enrollment.errors.ts'

export type EnrollmentProps = {
  readonly classroomId: string
  readonly sportId: string
  studentIds: string[]
}

/**
 * Quem escreve a lista, e o que isso permite.
 *
 * O representante só acrescenta, e só antes do sorteio. O conselheiro (e o
 * administrador, que cobre a falta dele) mexe a qualquer momento, inclusive
 * depois do sorteio, porque o time sorteado é a turma e trocar quem joga por ela
 * não muda a chave. Tirar atleta exige o motivo.
 */
export type EnrollmentWriter =
  { readonly role: 'representative' } | { readonly role: 'advisor'; readonly reason?: string }

/** O que a troca da lista deixou para trás: quem saiu dela. */
export type EnrollmentReplaced = { readonly removedStudentIds: string[] }

/**
 * A lista de atletas de uma turma numa modalidade. A identidade é o par turma e
 * modalidade; cada aluno entra por id (`_standards/domain.md` §4).
 */
export class Enrollment {
  private constructor(private readonly props: EnrollmentProps) {}

  /** Reidratação pelo repository: o dado passou pelas invariantes ao ser gravado. */
  static restore(props: EnrollmentProps): Enrollment {
    return new Enrollment({ ...props, studentIds: [...props.studentIds] })
  }

  /**
   * Troca a lista inteira pela recebida. A lista é inteira, e não um aluno por
   * vez: a tela é uma coluna de caixas marcadas, e o que ela tem para mandar é o
   * estado final. Nada muda quando devolve `left`.
   *
   * A ordem das recusas é a da tela: limite, aluno alheio, depois o que depende
   * de quem escreve.
   */
  replace(
    input: { readonly studentIds: readonly string[]; readonly writer: EnrollmentWriter },
    context: {
      readonly maxAthletes: number
      readonly classroomStudentIds: readonly string[]
      readonly drawn: boolean
    },
  ): Either<EnrollmentError, EnrollmentReplaced> {
    if (input.studentIds.length > context.maxAthletes)
      return left({ code: 'ENROLLMENT_LIMIT_EXCEEDED', maxAthletes: context.maxAthletes })

    const ofClassroom = new Set(context.classroomStudentIds)
    if (!input.studentIds.every((id) => ofClassroom.has(id)))
      return left({ code: 'ENROLLMENT_STUDENT_NOT_IN_CLASSROOM' })

    const kept = new Set(input.studentIds)
    const removedStudentIds = this.props.studentIds.filter((id) => !kept.has(id))

    if (input.writer.role === 'representative') {
      if (removedStudentIds.length > 0) return left({ code: 'ENROLLMENT_REMOVAL_FORBIDDEN' })
      if (context.drawn) return left({ code: 'ENROLLMENT_LOCKED' })
    }

    if (input.writer.role === 'advisor' && removedStudentIds.length > 0 && !input.writer.reason)
      return left({ code: 'ENROLLMENT_REASON_REQUIRED' })

    this.props.studentIds = [...input.studentIds]

    return right({ removedStudentIds })
  }

  snapshot(): Readonly<EnrollmentProps> {
    return { ...this.props, studentIds: [...this.props.studentIds] }
  }
}
