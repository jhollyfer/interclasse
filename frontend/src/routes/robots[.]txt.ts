import { createFileRoute } from '@tanstack/react-router'

import { isIndexable } from '#/lib/site-environment'
import { robotsTxt } from '#/lib/sitemap'

/**
 * O `robots.txt` é rota de servidor, e não arquivo de `public/`: o `Disallow: /`
 * de ambiente que não é produção e a URL absoluta do sitemap dependem do
 * ambiente (`frontend.md` §9.7).
 * _doc-lib/tanstack-start.md#guide/server-routes.
 */
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () =>
        new Response(robotsTxt({ indexable: await isIndexable() }), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        }),
    },
  },
})
