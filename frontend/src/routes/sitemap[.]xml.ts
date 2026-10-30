import { QueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { storefrontBracketsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import {
  SITEMAP_STATIC_ENTRIES,
  bracketEntries,
  sitemapXml,
} from '#/lib/sitemap'
import type { SitemapEntry } from '#/lib/sitemap'

/**
 * O `sitemap.xml` é rota de servidor, e não arquivo de `public/`: a URL
 * absoluta depende do ambiente (`frontend.md` §9.7). A lógica pura mora em
 * `lib/sitemap.ts`.
 *
 * Cada fonte de dado num `try` próprio: a API fora do ar tira as chaves do
 * mapa, mas as páginas fixas continuam nele.
 * _doc-lib/tanstack-start.md#guide/server-routes.
 */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const entries: Array<SitemapEntry> = [...SITEMAP_STATIC_ENTRIES]

        try {
          // Todas as chaves de uma vez, como a listagem pública: cinco
          // modalidades x duas categorias cabem em 100.
          const brackets = await new QueryClient().query(
            storefrontBracketsQueryOptions({ perPage: 100 }),
          )
          entries.push(...bracketEntries(brackets.data))
        } catch {
          // Sem as chaves, o mapa segue com as páginas fixas.
        }

        return new Response(sitemapXml(entries), {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
