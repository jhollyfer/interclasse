import { QueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import {
  storefrontBracketsQueryOptions,
  storefrontSiteQueryOptions,
} from '#/integrations/tanstack-query/queries/storefront'
import { hasAboutContent } from '#/lib/site-about'
import {
  SITEMAP_STATIC_ENTRIES,
  bracketEntries,
  sitemapXml,
} from '#/lib/sitemap'
import type { SitemapEntry } from '#/lib/sitemap'

/**
 * `sitemap.xml` is a server route, and not a `public/` file: the absolute
 * URL depends on the environment (`frontend.md` §9.7). The pure logic lives in
 * `lib/sitemap.ts`.
 *
 * Each data source in its own `try`: the API being down removes the brackets from the
 * map, but the fixed pages stay in it.
 * _doc-lib/tanstack-start.md#guide/server-routes.
 */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const client = new QueryClient()
        // "Sobre" only enters the map once the organization has written it: the page
        // is empty (and out of the menu) until then. Without an answer from the API it stays out.
        let showAbout = false
        try {
          showAbout = hasAboutContent(
            await client.query(storefrontSiteQueryOptions()),
          )
        } catch {
          // API down: the fixed pages still go out below.
        }
        const entries: Array<SitemapEntry> = SITEMAP_STATIC_ENTRIES.filter(
          (entry) => showAbout || entry.pathname !== '/about',
        )

        try {
          // All brackets at once, like the public listing: five
          // sports x two categories fit in 100.
          const brackets = await client.query(
            storefrontBracketsQueryOptions({ perPage: 100 }),
          )
          entries.push(...bracketEntries(brackets.data))
        } catch {
          // Without the brackets, the map carries on with the fixed pages.
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
