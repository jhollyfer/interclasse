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
 * The student of a classroom. Only becomes an athlete when enrolled in a sport, and
 * enrolled in an already drawn sport they do not leave (`_standards/domain.md` §1).
 * The classroom enters by id: it is another aggregate.
 */
export class Student {
  private constructor(private readonly props: StudentProps) {}

  /** Birth. The id and the clock come from outside: the domain does no I/O. */
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
        // Born with the edit stamped, the way the database row is born.
        updatedAt: input.now,
      }),
    )
  }

  /** Rehydration by the repository: the data passed through the invariants when it was saved. */
  static restore(props: StudentProps): Student {
    return new Student({ ...props })
  }

  /** Fixes the name. Moving the student to another classroom is delete and register in the other. */
  rename(name: string, now: Date): Either<StudentError, Student> {
    const trimmed = name.trim()
    if (trimmed.length === 0) return left({ code: 'STUDENT_NAME_EMPTY' })

    this.props.name = trimmed
    this.props.updatedAt = now

    return right(this)
  }

  /** Removing from the classroom refuses if the student plays in an already drawn sport. */
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
