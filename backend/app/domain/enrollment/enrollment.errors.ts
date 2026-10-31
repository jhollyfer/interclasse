/** What the athlete list refuses, as a fact (`_standards/domain.md` §2). */
export type EnrollmentError =
  /** More athletes than the sport maximum. */
  | { readonly code: 'ENROLLMENT_LIMIT_EXCEEDED'; readonly maxAthletes: number }
  /** A student who is not in the classroom: without this, the uuid of another classroom would enter the list. */
  | { readonly code: 'ENROLLMENT_STUDENT_NOT_IN_CLASSROOM' }
  /** The representative only adds; removing an athlete belongs to the teacher advisor. */
  | { readonly code: 'ENROLLMENT_REMOVAL_FORBIDDEN' }
  /** After the draw the representative's list locks. */
  | { readonly code: 'ENROLLMENT_LOCKED' }
  /** The advisor who removes an athlete says why. */
  | { readonly code: 'ENROLLMENT_REASON_REQUIRED' }
