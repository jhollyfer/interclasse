/** A match is scheduled or has a score. There is no "in progress": the score is entered at the end. */
export const MATCH_STATUS = {
  SCHEDULED: 'SCHEDULED',
  FINISHED: 'FINISHED',
} as const

export type MatchStatus = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS]

export const MATCH_STATUSES = Object.values(MATCH_STATUS)
