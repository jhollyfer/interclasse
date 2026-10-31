/**
 * What the classroom refuses, as a fact (`_standards/domain.md` §2): no HTTP status
 * or screen text. `_shared.classroom-refusal.ts` translates each one.
 */
export type ClassroomError =
  | { readonly code: 'CLASSROOM_INVALID_GRADE' }
  /** Changing the grade would take the drawn classroom to another category. */
  | { readonly code: 'CLASSROOM_CATEGORY_LOCKED' }
  /** The classroom already has a team in a bracket: deleting would leave it playing without a classroom. */
  | { readonly code: 'CLASSROOM_IN_COMPETITION' }
  /** The name belongs to another classroom: the check before saving and the race on the `unique`. */
  | { readonly code: 'CLASSROOM_ALREADY_EXISTS' }
  | { readonly code: 'ADVISOR_NOT_FOUND' }
  | { readonly code: 'ADVISOR_TAKEN' }
  | { readonly code: 'REPRESENTATIVE_NOT_FOUND' }
  | { readonly code: 'REPRESENTATIVE_TAKEN' }
