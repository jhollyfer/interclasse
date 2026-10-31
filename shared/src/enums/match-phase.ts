/** The phase of a match, named by the number of teams that enter it. */
export const MATCH_PHASE = {
  ROUND_OF_16: 'ROUND_OF_16',
  QUARTER: 'QUARTER',
  SEMI: 'SEMI',
  FINAL: 'FINAL',
} as const

export type MatchPhase = (typeof MATCH_PHASE)[keyof typeof MATCH_PHASE]

export const MATCH_PHASES = Object.values(MATCH_PHASE)
