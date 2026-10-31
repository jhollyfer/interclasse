import type { AdministratorAnnouncementShowResponse } from '@interclasse/shared'

import type { Announcement } from '#domain/announcement/announcement.entity'

/**
 * The announcement in the shape of the `shared/` response (`_standards/architecture.md`
 * §10): the presenter is typed by the same schema that OpenAPI and the frontend
 * read, so a field that is not in it does not reach the response.
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
