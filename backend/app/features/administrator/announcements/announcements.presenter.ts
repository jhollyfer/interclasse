import type { AdministratorAnnouncementShowResponse } from '@interclasse/shared'

import type { Announcement } from '#domain/announcement/announcement.entity'

/**
 * O aviso na forma da resposta do `shared/` (`_standards/architecture.md`
 * §10): o presenter é tipado pelo mesmo schema que o OpenAPI e o frontend
 * leem, então campo que não está nele não chega à resposta.
 */
export class AnnouncementPresenter {
  static show(announcement: Announcement): AdministratorAnnouncementShowResponse {
    const { id, title, body, pinned, createdAt, updatedAt } = announcement.snapshot()

    return {
      id,
      title,
      body,
      pinned,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt?.toISOString() ?? null,
    }
  }
}
