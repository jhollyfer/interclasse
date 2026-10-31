import type { StoragesFileUploadResponse } from '@interclasse/shared'

import type { Storage } from '#domain/storage/storage.entity'
import type { PresignedPart, UploadedPart } from '#services/multipart/multipart.contract'

/** What the client needs to upload the file, before becoming a response. */
export type FileUploadPlan = {
  readonly storage: Storage
  /** The read URL; absent when the record has just been born. */
  readonly url?: string
  readonly uploadId: string | null
  readonly partSize: number
  readonly totalParts: number
  readonly parts: ReadonlyArray<PresignedPart>
  readonly uploaded: ReadonlyArray<UploadedPart>
}

/**
 * The upload plan in the shape of the `shared/` response (`_standards/architecture.md`
 * §10): the presenter is typed by the same schema that OpenAPI and the frontend read.
 * It is the same shape in `POST /storages` and in `GET /storages/:id/parts`: starting and
 * resuming an upload are the same question.
 */
export class FilePresenter {
  static upload(plan: FileUploadPlan): StoragesFileUploadResponse {
    const file = plan.storage.snapshot()

    return {
      storage: {
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        status: file.status,
        uploadId: file.uploadId,
        partSize: file.partSize,
        createdAt: file.createdAt?.toISOString() ?? null,
        updatedAt: file.updatedAt?.toISOString() ?? null,
        deletedAt: file.deletedAt?.toISOString() ?? null,
        url: plan.url,
      },
      uploadId: plan.uploadId,
      partSize: plan.partSize,
      totalParts: plan.totalParts,
      parts: [...plan.parts],
      uploaded: [...plan.uploaded],
    }
  }
}
