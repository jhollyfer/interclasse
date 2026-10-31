import type {
  AdministratorAnnouncementShowResponse,
  Paginated,
  SortDirection,
} from '@interclasse/shared'

import type { Announcement } from '#domain/announcement/announcement.entity'

export type AnnouncementListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly sort: 'title' | 'createdAt'
  readonly direction: SortDirection
  /** Pinned before the others: the site order, which the panel list mirrors. */
  readonly pinnedFirst: boolean
}

/**
 * The announcement persistence, by intent (`_standards/domain.md` §5.1). The
 * single writer of the `announcements` table.
 */
export abstract class AnnouncementRepository {
  abstract findById(id: string): Promise<Announcement | null>
  abstract save(announcement: Announcement): Promise<void>
  abstract delete(announcement: Announcement): Promise<void>
  /** Lightweight read: the response shape straight from the query, without hydrating an entity. */
  abstract paginate(
    criteria: AnnouncementListCriteria,
  ): Promise<Paginated<AdministratorAnnouncementShowResponse>>
}
