/**
 * A photo of the site carousel. The advisor's photo is born `PENDING` and only shows
 * on the site after the administrator approves it: it is a student photo, on an open site.
 */
export const PHOTO_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

export type PhotoStatus = (typeof PHOTO_STATUS)[keyof typeof PHOTO_STATUS]

export const PHOTO_STATUSES = Object.values(PHOTO_STATUS)

/** What the administrator's review decides: approve or reject. */
export const PHOTO_REVIEW_STATUSES = [
  PHOTO_STATUS.APPROVED,
  PHOTO_STATUS.REJECTED,
] as const
