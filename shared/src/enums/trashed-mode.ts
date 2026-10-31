/**
 * The trash cut of listings. Absent is the usual one - active only -, so no read
 * changes its response for whoever did not ask.
 *
 * Here it is `deletedAt`, the soft delete.
 */
export const TRASHED_MODE = {
  /** Only what is in the trash. It is the listing of the restore screen. */
  ONLY: 'only',
  /** Active and removed together. */
  WITH: 'with',
} as const

export type TrashedMode = (typeof TRASHED_MODE)[keyof typeof TRASHED_MODE]

export const TRASHED_MODES = Object.values(TRASHED_MODE)
