/**
 * O que a modalidade recusa, como fato (`_standards/domain.md` §2): sem status
 * HTTP nem texto de tela. O use-case traduz cada um.
 */
export type SportError =
  | { readonly code: 'SPORT_INVALID_LIMITS' }
  | { readonly code: 'SPORT_ROSTER_ABOVE_LIMIT'; readonly largestRoster: number }
