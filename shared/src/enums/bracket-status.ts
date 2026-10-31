/**
 * Where the competition of a sport in a category stands: in progress or finished,
 * with a champion.
 *
 * There is no "open" key: before the draw the row simply does not exist, and it is
 * its absence that keeps enrollments open.
 */
export const BRACKET_STATUS = {
  KNOCKOUT: 'KNOCKOUT',
  FINISHED: 'FINISHED',
} as const

export type BracketStatus = (typeof BRACKET_STATUS)[keyof typeof BRACKET_STATUS]

export const BRACKET_STATUSES = Object.values(BRACKET_STATUS)
