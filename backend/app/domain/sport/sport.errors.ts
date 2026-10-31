/**
 * What the sport refuses, as a fact (`_standards/domain.md` §2): no HTTP
 * status or screen text. The use case translates each one.
 */
export type SportError =
  | { readonly code: 'SPORT_INVALID_LIMITS' }
  /** The name or slug belongs to another sport: the check before saving and the race on the `unique`. */
  | { readonly code: 'SPORT_ALREADY_EXISTS' }
  | { readonly code: 'SPORT_ROSTER_ABOVE_LIMIT'; readonly largestRoster: number }
