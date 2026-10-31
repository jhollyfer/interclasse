import { UPLOAD_STATUSES } from '../../enums/upload-status.js'
import { z } from '../../validator.js'

const date = () => z.iso.datetime({ offset: true })

/** The file record, without the URL: what the two responses below share. */
const fileShape = {
  id: z.uuid(),
  filename: z.string(),
  originalName: z.string(),
  mimetype: z.string(),
  size: z.number(),
  path: z.string(),
  status: z.enum(UPLOAD_STATUSES),
  uploadId: z.string().nullable(),
  partSize: z.number().nullable(),
  createdAt: date().nullable(),
  updatedAt: date().nullable(),
  deletedAt: date().nullable(),
}

/** The file as the API returns it: with the signed read URL. */
export const StoragesFileShowResponse = z.object({
  ...fileShape,
  url: z.string(),
})

/**
 * The upload plan of `POST /storages` and `GET /storages/:id/parts`: where to upload
 * the file. The record's `url` only exists once it has been read.
 */
export const StoragesFileUploadResponse = z.object({
  storage: z.object({ ...fileShape, url: z.string().optional() }),
  uploadId: z.string().nullable(),
  partSize: z.number(),
  totalParts: z.number(),
  parts: z.array(z.object({ partNumber: z.number(), url: z.string() })),
  uploaded: z.array(
    z.object({ partNumber: z.number(), size: z.number(), etag: z.string() }),
  ),
})

export type StoragesFileShowResponse = z.infer<typeof StoragesFileShowResponse>

export type StoragesFileUploadResponse = z.infer<
  typeof StoragesFileUploadResponse
>
