/**
 * The category of a classroom. Classrooms of different categories never face each
 * other: each sport has one bracket per category.
 */
export const CATEGORY = {
  /** Fundamental 1: 3rd to 5th grade. */
  F1: 'F1',
  /** Fundamental 2: 6th to 9th grade. */
  F2: 'F2',
} as const

export type Category = (typeof CATEGORY)[keyof typeof CATEGORY]

export const CATEGORIES = Object.values(CATEGORY)
