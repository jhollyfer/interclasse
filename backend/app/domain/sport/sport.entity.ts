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
 * A modalidade: futsal, vôlei, queimada. Guarda os limites de atletas por time
 * e a regra que os protege (`_standards/domain.md` §1).
 */
export class Sport {
  private constructor(private readonly props: SportProps) {}

  /** Nascimento. O id e o relógio chegam de fora: o domínio não faz I/O. */
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
        // Nasce com a edição carimbada, como a linha do banco nasce: a coluna
        // `updated_at` é preenchida no insert.
        updatedAt: input.now,
      }),
    )
  }

  /** Reidratação pelo repository: o dado passou pelas invariantes ao ser gravado. */
  static restore(props: SportProps): Sport {
    return new Sport({ ...props })
  }

  /**
   * Renomeia e muda os limites. O máximo não desce abaixo do maior elenco já
   * inscrito numa turma: a lista dela passaria a ser inválida sem ninguém mexer.
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

  /** Se o nome muda com estas mudanças: só aí vale conferir duplicidade. */
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
