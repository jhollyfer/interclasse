import { left, right } from '@interclasse/shared'
import type {
  AdministratorSportShowResponse,
  Either,
  Paginated,
  SortDirection,
} from '@interclasse/shared'

import { SportRepository, type SportListCriteria } from './sport.repository.ts'

import { Sport, type SportProps } from '#domain/sport/sport.entity'
import type { SportError } from '#domain/sport/sport.errors'
import { MemoryPagination } from '#core/memory-pagination'

/**
 * The second real implementation, for the use case unit test
 * (`_standards/domain.md` §5.3). It keeps copies: the test does not change the "database"
 * by reference.
 */
/** The sign of the comparison by sort direction. */
const SIGN = { asc: 1, desc: -1 } satisfies Record<SortDirection, number>

export class SportMemoryRepository extends SportRepository {
  private readonly rows = new Map<string, SportProps>()
  /** The enrolled roster of each classroom, per sport: what the test arranges. */
  private readonly rosters = new Map<string, number[]>()
  private readonly used = new Set<string>()

  /** Test arrangement: rosters already enrolled in this sport. */
  withRosters(sportId: string, sizes: number[]): this {
    this.rosters.set(sportId, sizes)
    return this
  }

  /** Test arrangement: the sport has an enrollment or a bracket. */
  markInUse(sportId: string): this {
    this.used.add(sportId)
    return this
  }

  async findById(id: string): Promise<Sport | null> {
    const props = this.rows.get(id)
    if (!props) return null

    return Sport.restore(structuredClone(props))
  }

  async existsByNameOrSlug(name: string, slug: string, exceptId?: string): Promise<boolean> {
    return [...this.rows.values()].some(
      (row) => row.id !== exceptId && (row.name === name || row.slug === slug),
    )
  }

  async largestRoster(sportId: string): Promise<number> {
    return Math.max(0, ...(this.rosters.get(sportId) ?? []))
  }

  async isInUse(sportId: string): Promise<boolean> {
    return this.used.has(sportId)
  }

  async save(sport: Sport): Promise<Either<SportError, void>> {
    const snapshot = structuredClone(sport.snapshot())
    const taken = [...this.rows.values()].some(
      (row) => row.id !== snapshot.id && (row.name === snapshot.name || row.slug === snapshot.slug),
    )
    // The name and slug `unique`s, as the database guarantees them.
    if (taken) return left({ code: 'SPORT_ALREADY_EXISTS' })

    this.rows.set(snapshot.id, snapshot)

    return right(undefined)
  }

  async delete(sport: Sport): Promise<void> {
    this.rows.delete(sport.id)
  }

  async paginate(criteria: SportListCriteria): Promise<Paginated<AdministratorSportShowResponse>> {
    const search = criteria.search?.toLowerCase()
    const sign = SIGN[criteria.direction]
    const all = [...this.rows.values()]
      .filter((row) => !search || row.name.toLowerCase().includes(search))
      .sort((a, b) => sign * String(a[criteria.sort]).localeCompare(String(b[criteria.sort])))
    const page = MemoryPagination.slice(all, criteria.page, criteria.perPage)

    return {
      meta: page.meta,
      data: page.data.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        minAthletes: row.minAthletes,
        maxAthletes: row.maxAthletes,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt?.toISOString() ?? null,
      })),
    }
  }
}
