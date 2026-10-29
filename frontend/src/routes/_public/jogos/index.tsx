import { createFileRoute } from '@tanstack/react-router'

import { storefrontMatchesQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { validateStorefrontSearch } from '#/lib/list-search'
import type { StorefrontSearch } from '#/lib/list-search'
import type { Merge } from '#/lib/interfaces'
import { SITE_TITLE } from '#/lib/constant'

/** Os filtros da tabela de jogos vivem na URL: o link compartilhado abre o mesmo recorte. */
type GamesSearch = Merge<
  StorefrontSearch,
  { sportId?: string; category?: string; status?: string }
>

function validateSearch(search: Record<string, unknown>): GamesSearch {
  const text = (value: unknown) =>
    (typeof value === 'string' && value) || undefined

  return {
    ...validateStorefrontSearch(search),
    sportId: text(search.sportId),
    category: text(search.category),
    status: text(search.status),
  }
}

export const Route = createFileRoute('/_public/jogos/')({
  validateSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient
      .query(storefrontMatchesQueryOptions(deps))
      .catch(() => undefined),
  head: () => ({ meta: [{ title: `Jogos | ${SITE_TITLE}` }] }),
})
