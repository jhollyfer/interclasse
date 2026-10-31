import type { Merge } from '@interclasse/shared'

import { validateStorefrontSearch } from '#/lib/list-search'
import type { StorefrontSearch } from '#/lib/list-search'

/** The match table's filters live in the URL: the shared link opens the same subset. */
export type GamesSearch = Merge<
  StorefrontSearch,
  { sportId?: string; category?: string; status?: string }
>

export function validateSearch(search: Record<string, unknown>): GamesSearch {
  const text = (value: unknown) =>
    (typeof value === 'string' && value) || undefined

  return {
    ...validateStorefrontSearch(search),
    sportId: text(search.sportId),
    category: text(search.category),
    status: text(search.status),
  }
}
