/** What the student refuses, as a fact (`_standards/domain.md` §2). */
export type StudentError =
  | { readonly code: 'STUDENT_NAME_EMPTY' }
  /** Enrolled in an already drawn sport: the team would lose an athlete. */
  | { readonly code: 'STUDENT_IN_COMPETITION' }
