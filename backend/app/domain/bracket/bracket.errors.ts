/**
 * What the bracket refuses, as a fact (`_standards/domain.md` §2): no HTTP status
 * or screen text. The use case translates each one.
 */
export type BracketError =
  | {
      readonly code: 'NOT_ENOUGH_TEAMS'
      readonly minTeams: number
      readonly minAthletes: number
    }
  | { readonly code: 'TOO_MANY_TEAMS'; readonly maxTeams: number }
  | { readonly code: 'BRACKET_HAS_RESULTS' }
  /** The sport already has a drawn bracket in this category: the race of two draws. */
  | { readonly code: 'BRACKET_ALREADY_EXISTS' }

/** What the match, a child of the bracket, refuses when scheduling, entering or undoing the score. */
export type MatchError =
  | { readonly code: 'MATCH_NOT_FOUND' }
  | { readonly code: 'MATCH_TEAMS_PENDING' }
  | { readonly code: 'MATCH_WINNER_REQUIRED' }
  | { readonly code: 'MATCH_NOT_PLAYED' }
  /** Correcting the winner after they have played the next one would rewrite what happened on the court. */
  | { readonly code: 'MATCH_NEXT_PLAYED_ON_SCORE' }
  /** Undoing this score would leave in the next one a team nobody knows why is there. */
  | { readonly code: 'MATCH_NEXT_PLAYED_ON_UNSCORE' }
