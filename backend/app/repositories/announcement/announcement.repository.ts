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
  /** Fixados antes dos demais: a ordem do site, que a lista do painel espelha. */
  readonly pinnedFirst: boolean
}

/**
 * A persistência do aviso, por intenção (`_standards/domain.md` §5.1). O
 * escritor único da tabela `announcements`.
 */
export abstract class AnnouncementRepository {
  abstract findById(id: string): Promise<Announcement | null>
  abstract save(announcement: Announcement): Promise<void>
  abstract delete(announcement: Announcement): Promise<void>
  /** Leitura leve: a forma da resposta direto da query, sem hidratar entidade. */
  abstract paginate(
    criteria: AnnouncementListCriteria,
  ): Promise<Paginated<AdministratorAnnouncementShowResponse>>
}
