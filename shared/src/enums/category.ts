/**
 * A categoria de uma turma. Turmas de categorias diferentes nunca se enfrentam:
 * cada modalidade tem uma chave por categoria.
 */
export const CATEGORY = {
  /** Fundamental 1: do 3º ao 5º ano. */
  F1: 'F1',
  /** Fundamental 2: do 6º ao 9º ano. */
  F2: 'F2',
} as const

export type Category = (typeof CATEGORY)[keyof typeof CATEGORY]

export const CATEGORIES = Object.values(CATEGORY)
