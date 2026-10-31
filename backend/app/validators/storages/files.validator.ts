import { STORAGE_MIMETYPES, STORAGE_SORT_COLUMNS, UPLOAD_STATUSES } from '@interclasse/shared'

import { vine, paginationFields, sortFields } from '#core/validator'
import type { Infer } from '#core/validator'
import env from '#start/env'

/**
 * What `POST /storages` receives: metadata, never bytes.
 *
 * The binary goes from the browser straight to the bucket, so type and size
 * are **declared** here and checked against the real object in
 * `POST /storages/:id/complete`. Refusing before signing is what keeps a
 * forbidden file from reaching the bucket; checking afterwards is what catches the
 * declaration having been a lie.
 */
/**
 * The per-file ceiling, in bytes. It comes from the environment and has no default: without the
 * variable the application does not even start (`start/env.ts`). The `size` column is
 * `bigint` precisely so as not to impose here a ceiling the operator did not ask for.
 */
export const UPLOAD_MAX_SIZE = env.get('UPLOAD_MAX_SIZE')

export const StoragesFileCreateValidator = vine.create({
  fileName: vine.string().trim().minLength(1).maxLength(255),
  mimetype: vine.enum(STORAGE_MIMETYPES),
  size: vine.number().min(1).max(UPLOAD_MAX_SIZE).withoutDecimals(),
})

export type StoragesFileCreatePayload = Infer<typeof StoragesFileCreateValidator>

/**
 * What `POST /storages/:id/complete` receives: the `ETag` of each uploaded part.
 *
 * Empty - or absent - is a single-part upload, which has no part to
 * confirm. The ceiling of ten thousand is S3's own.
 */
export const StoragesFileCompleteValidator = vine.create({
  parts: vine
    .array(
      vine.object({
        partNumber: vine.number().min(1).max(10_000).withoutDecimals(),
        etag: vine.string().trim().maxLength(64).minLength(1),
      }),
    )
    .optional(),
})

export type StoragesFileCompletePayload = Infer<typeof StoragesFileCompleteValidator>

/**
 * What `GET /storages` receives.
 *
 * The panel file library: `?search` finds by original label, by generated
 * name or by type - it is the `backend-old` search, on the columns that
 * survived the mapping -, and `?status` and `?mimetype` cut what has already gone up
 * and what is an image.
 *
 * Without `trashedField()`: `storages` has `deleted_at`, but deleting a file is
 * `DELETE /storages/:id`, which removes the row **and** the binary. There is no file
 * trash to restore, and the parameter would be accepted and silently ignored.
 */
export const StoragesFilePaginateValidator = vine.create({
  ...paginationFields(),
  status: vine.enum(UPLOAD_STATUSES).optional(),
  // The closed list, not free text: it is the same tuple `POST /storages`
  // accepts, so filtering by a type the API never saves is a 422 instead of an
  // empty page that looks like a bug.
  mimetype: vine.enum(STORAGE_MIMETYPES).optional(),
  ...sortFields(STORAGE_SORT_COLUMNS),
})

export type StoragesFilePaginatePayload = Infer<typeof StoragesFilePaginateValidator>
