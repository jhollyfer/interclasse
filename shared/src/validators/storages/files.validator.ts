import { STORAGE_MIMETYPES } from '../../enums/storage-mimetype.js'
import { UPLOAD_STATUSES } from '../../enums/upload-status.js'
import { paginationFields, sortFields, z } from '../../validator.js'

/**
 * Upload metadata, never bytes. Mirror (path and name) of the VineJS one in
 * `backend/app/validators/storages/files.validator.ts`. The `size` ceiling comes from
 * the server environment and only it enforces it.
 */
export const StoragesFileCreateValidator = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimetype: z.enum(STORAGE_MIMETYPES),
  size: z.number().int().min(1),
})

/** The `ETag` of each uploaded part; absent means a single-part upload. */
export const StoragesFileCompleteValidator = z.object({
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1).max(10_000),
        etag: z.string().trim().min(1).max(64),
      }),
    )
    .optional(),
})

export const STORAGE_SORT_COLUMNS = [
  'originalName',
  'mimetype',
  'size',
  'createdAt',
] as const

export const StoragesFilePaginateValidator = z.object({
  ...paginationFields(),
  status: z.enum(UPLOAD_STATUSES).optional(),
  mimetype: z.enum(STORAGE_MIMETYPES).optional(),
  ...sortFields(STORAGE_SORT_COLUMNS),
})

export type StoragesFileCreatePayload = z.infer<
  typeof StoragesFileCreateValidator
>

export type StoragesFileCompletePayload = z.infer<
  typeof StoragesFileCompleteValidator
>

export type StoragesFilePaginatePayload = z.infer<
  typeof StoragesFilePaginateValidator
>
