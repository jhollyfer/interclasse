import { Slug, left, right, type Either } from '@interclasse/shared'

import type { SportError } from './sport.errors.ts'

export type SportProps = {
  readonly id: string
  name: string
  slug: string
  minAthletes: number
  maxAthletes: number
  readonly createdAt: Date
  updatedAt: Date | null
}

type SportChanges = {
  readonly name?: string
  readonly minAthletes?: number
  readonly maxAthletes?: number
}

/**
 * The sport: futsal, volleyball, dodgeball. It holds the athlete limits per team
 * and the rule that protects them (`_standards/domain.md` §1).
 */
export class Sport {
  private constructor(private readonly props: SportProps) {}

  /** Birth. The id and the clock come from outside: the domain does no I/O. */
  static create(input: {
    readonly id: string
    readonly name: string
    readonly minAthletes: number
    readonly maxAthletes: number
    readonly now: Date
  }): Either<SportError, Sport> {
    if (input.minAthletes > input.maxAthletes) return left({ code: 'SPORT_INVALID_LIMITS' })

    return right(
      new Sport({
        id: input.id,
        name: input.name,
        slug: Slug.from(input.name).value,
        minAthletes: input.minAthletes,
        maxAthletes: input.maxAthletes,
        createdAt: input.now,
        // Born with the edit stamped, the way the database row is born: the column
        // `updated_at` is filled in on insert.
        updatedAt: input.now,
      }),
    )
  }

  /** Rehydration by the repository: the data passed through the invariants when it was saved. */
  static restore(props: SportProps): Sport {
    return new Sport({ ...props })
  }

  /**
   * Renames and changes the limits. The maximum does not go below the largest roster already
   * enrolled in a classroom: its list would become invalid without anyone touching it.
   */
  update(
    changes: SportChanges,
    context: { readonly largestRoster: number; readonly now: Date },
  ): Either<SportError, Sport> {
    const minAthletes = changes.minAthletes ?? this.props.minAthletes
    const maxAthletes = changes.maxAthletes ?? this.props.maxAthletes

    if (minAthletes > maxAthletes) return left({ code: 'SPORT_INVALID_LIMITS' })
    if (maxAthletes < this.props.maxAthletes && context.largestRoster > maxAthletes)
      return left({ code: 'SPORT_ROSTER_ABOVE_LIMIT', largestRoster: context.largestRoster })

    if (changes.name !== undefined && changes.name !== this.props.name) {
      this.props.name = changes.name
      this.props.slug = Slug.from(changes.name).value
    }
    this.props.minAthletes = minAthletes
    this.props.maxAthletes = maxAthletes
    this.props.updatedAt = context.now

    return right(this)
  }

  /** Whether the name changes with these changes: only then is it worth checking for duplicates. */
  renamesTo(name: string | undefined): name is string {
    return name !== undefined && name !== this.props.name
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<SportProps> {
    return { ...this.props }
  }
}
