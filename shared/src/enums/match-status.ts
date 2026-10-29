/** Uma partida está marcada ou tem placar. Não há "em andamento": o placar entra ao final. */
export const MATCH_STATUS = {
  SCHEDULED: 'SCHEDULED',
  FINISHED: 'FINISHED',
} as const

export type MatchStatus = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS]

export const MATCH_STATUSES = Object.values(MATCH_STATUS)
