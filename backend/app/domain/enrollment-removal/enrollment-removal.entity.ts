import { USER_ROLE, left, right, type Either, type UserRole } from '@interclasse/shared'

import type { EnrollmentRemovalError } from './enrollment-removal.errors.ts'

export type EnrollmentRemovalProps = {
  readonly id: string
  readonly classroomId: string
  readonly sportId: string
  readonly studentId: string | null
  /** Copiado, e não só referenciado: o aluno pode sair da turma e o aviso segue dizendo quem foi. */
  readonly studentName: string
  readonly reason: string
  readonly actorId: string | null
  acknowledgedAt: Date | null
  readonly createdAt: Date
  updatedAt: Date | null
}

/**
 * O aviso de atleta tirado de uma modalidade, com o motivo. O conselheiro tira
 * a qualquer momento, inclusive depois do sorteio, e o administrador recebe o
 * aviso com a justificativa (`_standards/domain.md` §1).
 */
export class EnrollmentRemoval {
  private constructor(private readonly props: EnrollmentRemovalProps) {}

  /**
   * Registra a saída. O administrador não avisa a si mesmo: a remoção dele já
   * nasce lida.
   */
  static record(input: {
    readonly id: string
    readonly classroomId: string
    readonly sportId: string
    readonly studentId: string
    readonly studentName: string
    readonly reason: string
    readonly actorId: string
    readonly actorRole: UserRole
    readonly now: Date
  }): EnrollmentRemoval {
    let acknowledgedAt: Date | null = null
    if (input.actorRole === USER_ROLE.ADMINISTRATOR) acknowledgedAt = input.now

    return new EnrollmentRemoval({
      id: input.id,
      classroomId: input.classroomId,
      sportId: input.sportId,
      studentId: input.studentId,
      studentName: input.studentName,
      reason: input.reason,
      actorId: input.actorId,
      acknowledgedAt,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  /** Reidratação pelo repository: o dado passou pelas invariantes ao ser gravado. */
  static restore(props: EnrollmentRemovalProps): EnrollmentRemoval {
    return new EnrollmentRemoval({ ...props })
  }

  /** A ciência do administrador. Repetir não muda a data da primeira. */
  acknowledge(at: Date): Either<EnrollmentRemovalError, EnrollmentRemoval> {
    if (this.props.acknowledgedAt) return left({ code: 'ENROLLMENT_REMOVAL_ALREADY_ACKNOWLEDGED' })

    this.props.acknowledgedAt = at
    this.props.updatedAt = at

    return right(this)
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<EnrollmentRemovalProps> {
    return { ...this.props }
  }
}
