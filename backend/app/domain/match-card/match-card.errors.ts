/**
 * What the card refuses, as a fact (`_standards/domain.md` §2): no HTTP status
 * or screen text. The use case translates each one.
 */
export type MatchCardError =
  { readonly code: 'MATCH_TEAMS_PENDING' } | { readonly code: 'STUDENT_NOT_IN_MATCH' }
