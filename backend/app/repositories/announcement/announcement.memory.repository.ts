import type {
  AdministratorAnnouncementShowResponse,
  Paginated,
  SortDirection,
} from '@interclasse/shared'

import { AnnouncementRepository, type AnnouncementListCriteria } from './announcement.repository.ts'

import { Announcement, type AnnouncementProps } from '#domain/announcement/announcement.entity'
import { MemoryPagination } from '#core/memory-pagination'

/** O sinal da comparação por sentido de ordenação. */
const SIGN = { asc: 1, desc: -1 } satisfies Record<SortDirection, number>

/**
 * A segunda implementação de verdade, para o teste unitário do use-case
 * (`_standards/domain.md` §5.3). Guarda cópias: o teste não altera o "banco"
 * por referência.
 */
export class AnnouncementMemoryRepository extends AnnouncementRepository {
  private readonly rows = new Map<string, AnnouncementProps>()

  async findById(id: string): Promise<Announcement | null> {
    const props = this.rows.get(id)
    if (!props) return null

    return Announcement.restore(structuredClone(props))
  }

  async save(announcement: Announcement): Promise<void> {
    this.rows.set(announcement.id, structuredClone(announcement.snapshot()))
  }

  async delete(announcement: Announcement): Promise<void> {
    this.rows.delete(announcement.id)
  }

  async paginate(
    criteria: AnnouncementListCriteria,
  ): Promise<Paginated<AdministratorAnnouncementShowResponse>> {
    const search = criteria.search?.toLowerCase()
    const sign = SIGN[criteria.direction]
    const all = [...this.rows.values()]
      .filter((row) => !search || row.title.toLowerCase().includes(search))
      .sort((a, b) => this.compare(a, b, criteria, sign))
    const page = MemoryPagination.slice(all, criteria.page, criteria.perPage)

    return {
      meta: page.meta,
      data: page.data.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        pinned: row.pinned,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt?.toISOString() ?? null,
      })),
    }
  }

  private compare(
    a: AnnouncementProps,
    b: AnnouncementProps,
    criteria: AnnouncementListCriteria,
    sign: number,
  ): number {
    if (criteria.pinnedFirst && a.pinned && !b.pinned) return -1
    if (criteria.pinnedFirst && !a.pinned && b.pinned) return 1

    if (criteria.sort === 'createdAt') return sign * (a.createdAt.getTime() - b.createdAt.getTime())

    return sign * a.title.localeCompare(b.title)
  }
}
