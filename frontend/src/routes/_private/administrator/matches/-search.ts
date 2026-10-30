import { withExtra } from '#/lib/list-search'

export const validateSearch = withExtra([
  'sportId',
  'category',
  'phase',
  'status',
] as const)
