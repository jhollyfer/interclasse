/**
 * A foto do carrossel do site. A do conselheiro nasce `PENDING` e só aparece
 * no site depois que o administrador aprova: é foto de aluno, em site aberto.
 */
export const PHOTO_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

export type PhotoStatus = (typeof PHOTO_STATUS)[keyof typeof PHOTO_STATUS]

export const PHOTO_STATUSES = Object.values(PHOTO_STATUS)

/** O que a revisão do administrador decide: aprovar ou recusar. */
export const PHOTO_REVIEW_STATUSES = [PHOTO_STATUS.APPROVED, PHOTO_STATUS.REJECTED] as const
