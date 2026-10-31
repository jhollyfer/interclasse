import { createServerFn } from '@tanstack/react-start'

/**
 * The environment the site runs in, read from the server per request
 * (`SITE_ENV`, without `VITE_`: it never goes into the bundle). Only `production` enters
 * the search engines; staging, preview and development answer `noindex` and
 * `Disallow: /` (`frontend.md` §9.7). It does not depend on `import.meta.env.PROD`:
 * the staging image is the same as production, built in production mode.
 * _doc-lib/tanstack-start.md#guide/server-functions.
 */
export const isIndexable = createServerFn({ method: 'GET' }).handler(
  (): boolean => process.env.SITE_ENV === 'production',
)
