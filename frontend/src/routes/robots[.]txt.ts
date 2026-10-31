import { createFileRoute } from '@tanstack/react-router'

import { isIndexable } from '#/lib/site-environment'
import { robotsTxt } from '#/lib/sitemap'

/**
 * `robots.txt` is a server route, and not a `public/` file: the environment's `Disallow: /`
 * when it is not production and the sitemap's absolute URL depend on the
 * environment (`frontend.md` §9.7).
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
