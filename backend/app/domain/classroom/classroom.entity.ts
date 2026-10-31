import { CATEGORY, GRADES, left, right, type Category, type Either } from '@interclasse/shared'

import type { ClassroomError } from './classroom.errors.ts'

export type ClassroomProps = {
  readonly id: string
  name: string
  grade: number
  category: Category
  advisorId: string | null
  representativeId: string | null
  readonly createdAt: Date
  updatedAt: Date | null
}

/** The person links of a classroom. */
export type ClassroomLinks = {
  readonly advisorId?: string | null
  readonly representativeId?: string | null
}

type ClassroomChanges = ClassroomLinks & {
  readonly name?: string
  readonly grade?: number
}

/**
 * What the database knows about a given account: `exists` is a live account with the role of
 * the link (without it, a representative named as advisor would gain the
 * student registry of the whole classroom); `taken` is an account already linked to another classroom.
 */
export type ClassroomLinkFacts = { readonly exists: boolean; readonly taken: boolean }

export type ClassroomPeopleFacts = {
  readonly advisor?: ClassroomLinkFacts
  readonly representative?: ClassroomLinkFacts
}

/** A missing fact is an account that does not exist: refusal is the safe exit. */
const MISSING = { exists: false, taken: false } satisfies ClassroomLinkFacts

/**
 * The classroom: the unit that competes. It holds the category derived from the grade, the lock
 * after the draw and the rules of the advisor and representative links
 * (`_standards/domain.md` §1).
 */
export class Classroom {
  private constructor(private readonly props: ClassroomProps) {}

  /**
   * The category the grade determines. Derived, never sent by the client: a 9th
   * grade stored as `F1` would play against 8-year-old children.
   */
  static categoryOf(grade: number): Category {
    if (grade <= 5) return CATEGORY.F1

    return CATEGORY.F2
  }

  /** Birth. The id and the clock come from outside: the domain does no I/O. */
  static create(
    input: {
      readonly id: string
      readonly name: string
      readonly grade: number
      readonly advisorId?: string | null
      readonly representativeId?: string | null
      readonly now: Date
    },
    facts: ClassroomPeopleFacts,
  ): Either<ClassroomError, Classroom> {
    if (!Classroom.gradeInRange(input.grade)) return left({ code: 'CLASSROOM_INVALID_GRADE' })

    const advisorId = input.advisorId ?? null
    const representativeId = input.representativeId ?? null
    const refused = Classroom.refusePeople({ advisorId, representativeId }, facts)
    if (refused) return left(refused)

    return right(
      new Classroom({
        id: input.id,
        name: input.name,
        grade: input.grade,
        category: Classroom.categoryOf(input.grade),
        advisorId,
        representativeId,
        createdAt: input.now,
        // Born with the edit stamped, the way the database row is born.
        updatedAt: input.now,
      }),
    )
  }

  /** Rehydration by the repository: the data passed through the invariants when it was saved. */
  static restore(props: ClassroomProps): Classroom {
    return new Classroom({ ...props })
  }

  /**
   * Renames, changes the grade and the links. On edit only the link that
   * changed is checked: what was already stored was accepted when it came in, and refusing it now
   * would block even renaming the classroom. Nothing changes when it returns `left`.
   */
  update(
    changes: ClassroomChanges,
    context: {
      readonly facts: ClassroomPeopleFacts
      readonly inCompetition: boolean
      readonly now: Date
    },
  ): Either<ClassroomError, Classroom> {
    const grade = changes.grade ?? this.props.grade
    if (!Classroom.gradeInRange(grade)) return left({ code: 'CLASSROOM_INVALID_GRADE' })

    const refused = Classroom.refusePeople(this.changedLinks(changes), context.facts)
    if (refused) return left(refused)

    // Changing category with the classroom in a bracket would leave it playing against the
    // wrong category.
    const category = Classroom.categoryOf(grade)
    if (category !== this.props.category && context.inCompetition)
      return left({ code: 'CLASSROOM_CATEGORY_LOCKED' })

    this.props.name = changes.name ?? this.props.name
    this.props.grade = grade
    this.props.category = category
    if (changes.advisorId !== undefined) this.props.advisorId = changes.advisorId
    if (changes.representativeId !== undefined)
      this.props.representativeId = changes.representativeId
    this.props.updatedAt = context.now

    return right(this)
  }

  /** Deleting with the classroom in a drawn bracket refuses; without a team, it allows. */
  remove(context: { readonly inCompetition: boolean }): Either<ClassroomError, Classroom> {
    if (context.inCompetition) return left({ code: 'CLASSROOM_IN_COMPETITION' })

    return right(this)
  }

  /** Whether the name changes with these changes: only then is it worth checking for duplicates. */
  renamesTo(name: string | undefined): name is string {
    return name !== undefined && name !== this.props.name
  }

  /** Whether the grade would take the classroom to another category: only then is it worth asking about the draw. */
  changesCategoryWith(grade: number | undefined): boolean {
    if (grade === undefined) return false

    return Classroom.categoryOf(grade) !== this.props.category
  }

  /** The new links to check: the ones that change to an account, and not to `null`. */
  changedLinks(changes: ClassroomLinks): { advisorId?: string; representativeId?: string } {
    const links: { advisorId?: string; representativeId?: string } = {}

    if (changes.advisorId && changes.advisorId !== this.props.advisorId)
      links.advisorId = changes.advisorId
    if (changes.representativeId && changes.representativeId !== this.props.representativeId)
      links.representativeId = changes.representativeId

    return links
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<ClassroomProps> {
    return { ...this.props }
  }

  private static gradeInRange(grade: number): boolean {
    return grade >= GRADES.MIN && grade <= GRADES.MAX
  }

  /** The first refusal of the links, in the order the screen asks for them. */
  private static refusePeople(
    links: ClassroomLinks,
    facts: ClassroomPeopleFacts,
  ): ClassroomError | null {
    if (links.advisorId) {
      const advisor = facts.advisor ?? MISSING
      if (!advisor.exists) return { code: 'ADVISOR_NOT_FOUND' }
      if (advisor.taken) return { code: 'ADVISOR_TAKEN' }
    }

    if (links.representativeId) {
      const representative = facts.representative ?? MISSING
      if (!representative.exists) return { code: 'REPRESENTATIVE_NOT_FOUND' }
      if (representative.taken) return { code: 'REPRESENTATIVE_TAKEN' }
    }

    return null
  }
}
