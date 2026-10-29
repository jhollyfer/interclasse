import { STORAGE_MIMETYPES } from '../../enums/storage-mimetype.js'
import { UPLOAD_STATUSES } from '../../enums/upload-status.js'
import { z } from '../../validator.js'

const date = () => z.iso.datetime({ offset: true })

/** O registro do arquivo, sem a URL: o que as duas respostas abaixo dividem. */
const fileShape = {
  id: z.uuid(),
  filename: z.string(),
  originalName: z.string(),
  mimetype: z.enum(STORAGE_MIMETYPES),
  size: z.number(),
  path: z.string(),
  status: z.enum(UPLOAD_STATUSES),
  uploadId: z.string().nullable(),
  partSize: z.number().nullable(),
  createdAt: date().nullable(),
  updatedAt: date().nullable(),
  deletedAt: date().nullable(),
}

/** O arquivo como a API devolve: com a URL assinada de leitura. */
export const StoragesFileShowResponse = z.object({ ...fileShape, url: z.string() })

/**
 * O plano de upload de `POST /storages` e `GET /storages/:id/parts`: por onde
 * subir o arquivo. A `url` do registro só existe quando ele foi lido.
 */
export const StoragesFileUploadResponse = z.object({
  storage: z.object({ ...fileShape, url: z.string().optional() }),
  uploadId: z.string().nullable(),
  partSize: z.number(),
  totalParts: z.number(),
  parts: z.array(z.object({ partNumber: z.number(), url: z.string() })),
  uploaded: z.array(z.object({ partNumber: z.number(), size: z.number(), etag: z.string() })),
})

export type StoragesFileShowResponse = z.infer<typeof StoragesFileShowResponse>

export type StoragesFileUploadResponse = z.infer<typeof StoragesFileUploadResponse>
