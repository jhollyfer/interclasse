/** What the removal notice refuses, as a fact (`_standards/domain.md` §2). */
export type EnrollmentRemovalError =
  /** The acknowledgement was already given: repeating it keeps the first date. */
  { readonly code: 'ENROLLMENT_REMOVAL_ALREADY_ACKNOWLEDGED' }
