/**
 * The frontend's build variables, read once and checked here.
 *
 * `VITE_*` only: Vite substitutes them into the bundle at build time, so
 * everything that goes through this file is public. The check is synchronous
 * and by hand, with no schema that resolves a promise - the module runs before
 * the router mounts, and a bad value must stop the boot with the right message
 * instead of becoming a request to a broken address.
 *
 * Server runtime values (`SERVER_API_URL`) do not belong here: they are read per
 * request inside the `.server()` of `integrations/tanstack-query/http.ts`.
 */

/** Without `VITE_API_URL`, the `localhost:3333` that the backend's `pnpm dev` starts. */
const DEV_API_URL = 'http://localhost:3333'

/** Without `VITE_SITE_URL`, the `localhost:3001` that the frontend's `pnpm dev` starts. */
const DEV_SITE_URL = 'http://localhost:3001'

/**
 * A public build URL: when absent it takes the development fallback, and a
 * bad value stops the boot with the right message.
 *
 * No trailing slash: `request()` does `BASE_URL.concat(path)` with the path
 * starting with `/` (a slash would become `//storefront`), and `canonical`
 * and `hreflang` append the path to the site address.
 */
function publicUrl(
  name: string,
  value: string | undefined,
  fallback: string,
): string {
  if (!value) return fallback

  if (!URL.canParse(value)) {
    throw new Error(`${name} não é uma URL: "${value}".`)
  }

  if (value.endsWith('/')) {
    throw new Error(`${name} não pode terminar em "/": "${value}".`)
  }

  return value
}

export const env = {
  VITE_API_URL: publicUrl(
    'VITE_API_URL',
    import.meta.env.VITE_API_URL,
    DEV_API_URL,
  ),
  /**
   * The site's public address: the base for `canonical`, `hreflang` and the
   * sitemap, which need an absolute URL that SSR has no way to discover.
   */
  VITE_SITE_URL: publicUrl(
    'VITE_SITE_URL',
    import.meta.env.VITE_SITE_URL,
    DEV_SITE_URL,
  ),
} as const
