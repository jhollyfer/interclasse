/** O que o aviso de remoção recusa, como fato (`_standards/domain.md` §2). */
export type EnrollmentRemovalError =
  /** A ciência já foi dada: repetir mantém a data da primeira. */
  { readonly code: 'ENROLLMENT_REMOVAL_ALREADY_ACKNOWLEDGED' }
