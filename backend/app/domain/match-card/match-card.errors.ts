/**
 * O que o cartão recusa, como fato (`_standards/domain.md` §2): sem status HTTP
 * nem texto de tela. O use-case traduz cada um.
 */
export type MatchCardError =
  { readonly code: 'MATCH_TEAMS_PENDING' } | { readonly code: 'STUDENT_NOT_IN_MATCH' }
