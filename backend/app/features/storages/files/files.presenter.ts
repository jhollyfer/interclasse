import type { StoragesFileUploadResponse } from '@interclasse/shared'

import type { Storage } from '#domain/storage/storage.entity'
import type { PresignedPart, UploadedPart } from '#services/multipart/multipart.contract'

/** O que o cliente precisa para subir o arquivo, antes de virar resposta. */
export type FileUploadPlan = {
  readonly storage: Storage
  /** A URL de leitura; ausente quando o registro acabou de nascer. */
  readonly url?: string
  readonly uploadId: string | null
  readonly partSize: number
  readonly totalParts: number
  readonly parts: ReadonlyArray<PresignedPart>
  readonly uploaded: ReadonlyArray<UploadedPart>
}

/**
 * O plano de upload na forma da resposta do `shared/` (`_standards/architecture.md`
 * §10): o presenter é tipado pelo mesmo schema que o OpenAPI e o frontend leem.
 * É a mesma forma em `POST /storages` e em `GET /storages/:id/parts`: começar e
 * retomar um upload são a mesma pergunta.
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
