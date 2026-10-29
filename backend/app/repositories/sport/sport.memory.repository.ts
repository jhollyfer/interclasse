import type { AdministratorSportShowResponse, Paginated, SortDirection } from '@interclasse/shared'

import { SportRepository, type SportListCriteria } from './sport.repository.ts'

import { Sport, type SportProps } from '#domain/sport/sport.entity'
import { MemoryPagination } from '#repositories/memory-pagination'

/**
 * A segunda implementação de verdade, para o teste unitário do use-case
 * (`_standards/domain.md` §5.3). Guarda cópias: o teste não altera o "banco"
 * por referência.
 */
/** O sinal da comparação por sentido de ordenação. */
const SIGN = { asc: 1, desc: -1 } satisfies Record<SortDirection, number>

export class SportMemoryRepository extends SportRepository {
  private readonly rows = new Map<string, SportProps>()
  /** O elenco inscrito de cada turma, por modalidade: o que o teste arranja. */
  private readonly rosters = new Map<string, number[]>()
  private readonly used = new Set<string>()

  /** Arranjo do teste: elencos já inscritos nesta modalidade. */
  withRosters(sportId: string, sizes: number[]): this {
    this.rosters.set(sportId, sizes)
    return this
  }

  /** Arranjo do teste: a modalidade tem inscrição ou chave. */
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

  async save(sport: Sport): Promise<void> {
    this.rows.set(sport.id, structuredClone(sport.snapshot()))
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
