import { left, right, type Either } from '@interclasse/shared'

import type { StudentError } from './student.errors.ts'

export type StudentProps = {
  readonly id: string
  readonly classroomId: string
  name: string
  readonly createdAt: Date
  updatedAt: Date | null
}

/**
 * O aluno de uma turma. Só vira atleta quando inscrito numa modalidade, e
 * inscrito numa modalidade já sorteada não sai (`_standards/domain.md` §1).
 * A turma entra por id: é outro agregado.
 */
export class Student {
  private constructor(private readonly props: StudentProps) {}

  /** Nascimento. O id e o relógio chegam de fora: o domínio não faz I/O. */
  static create(input: {
    readonly id: string
    readonly classroomId: string
    readonly name: string
    readonly now: Date
  }): Either<StudentError, Student> {
    const name = input.name.trim()
    if (name.length === 0) return left({ code: 'STUDENT_NAME_EMPTY' })

    return right(
      new Student({
        id: input.id,
        classroomId: input.classroomId,
        name,
        createdAt: input.now,
        // Nasce com a edição carimbada, como a linha do banco nasce.
        updatedAt: input.now,
      }),
    )
  }

  /** Reidratação pelo repository: o dado passou pelas invariantes ao ser gravado. */
  static restore(props: StudentProps): Student {
    return new Student({ ...props })
  }

  /** Corrige o nome. Trocar o aluno de turma é apagar e cadastrar na outra. */
  rename(name: string, now: Date): Either<StudentError, Student> {
    const trimmed = name.trim()
    if (trimmed.length === 0) return left({ code: 'STUDENT_NAME_EMPTY' })

    this.props.name = trimmed
    this.props.updatedAt = now

    return right(this)
  }

  /** Tirar da turma recusa se o aluno joga numa modalidade já sorteada. */
  remove(context: { readonly inDrawnSport: boolean }): Either<StudentError, Student> {
    if (context.inDrawnSport) return left({ code: 'STUDENT_IN_COMPETITION' })

    return right(this)
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<StudentProps> {
    return { ...this.props }
  }
}
