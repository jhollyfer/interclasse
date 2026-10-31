/**
 * The state of a file while it uploads. It exists because the binary no longer goes
 * through this application: `POST /storages` writes the row and returns signed URLs,
 * the browser uploads the parts straight to the bucket, and only then
 * `POST /storages/:id/complete` confirms. Between the two the row exists without a
 * sound binary, and that is what `PENDING` names.
 *
 * Only `UPLOADED` can be attached to anything - the backend refuses the rest, so
 * nothing points to a half-uploaded file.
 */
export const UPLOAD_STATUS = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
} as const

export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS]

export const UPLOAD_STATUSES = Object.values(UPLOAD_STATUS)
