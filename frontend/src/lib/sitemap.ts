import { env } from '#/env'
import { localizedUrl } from '#/lib/page-head'
import { locales } from '#/paraglide/runtime'

/**
 * The pure logic of `sitemap.xml` and `robots.txt` (`frontend.md` §9.7). The
 * server routes (`routes/sitemap[.]xml.ts`, `routes/robots[.]txt.ts`) only
 * fetch the data and return the text assembled here.
 * _doc-lib/tanstack-start.md#guide/server-routes.
 */

/** An indexable page: the path without language prefix and the data's `updatedAt`. */
export type SitemapEntry = Readonly<{
  pathname: string
  lastModified?: string | null
}>

/** The public pages that do not depend on data. */
export const SITEMAP_STATIC_ENTRIES = [
  { pathname: '/' },
  { pathname: '/matches' },
  { pathname: '/standings' },
  { pathname: '/announcements' },
  { pathname: '/about' },
] as const satisfies ReadonlyArray<SitemapEntry>

/** Each sport's bracket: one page per bracket, with its `updatedAt`. */
export function bracketEntries(
  brackets: ReadonlyArray<{ id: string; updatedAt: string | null }>,
): Array<SitemapEntry> {
  return brackets.map((bracket) => ({
    pathname: `/standings/${bracket.id}`,
    lastModified: bracket.updatedAt,
  }))
}

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

function escapeXml(value: string): string {
  return value.replaceAll(/[&<>"']/g, (char) => ESCAPES[char] ?? char)
}

/** The reciprocal `xhtml:link`s of the three versions, plus the `x-default` (pt-BR). */
function alternates(pathname: string): string {
  const links = locales.map(
    (locale) =>
      `<xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(localizedUrl(pathname, locale))}"/>`,
  )
  links.push(
    `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(localizedUrl(pathname, 'pt-BR'))}"/>`,
  )

  return links.join('')
}

/** One entry per language, each with its siblings' `hreflang`. */
function urls(entry: SitemapEntry): Array<string> {
  return locales.map((locale) => {
    let lastmod = ''
    if (entry.lastModified) {
      lastmod = `<lastmod>${escapeXml(entry.lastModified)}</lastmod>`
    }

    return `<url><loc>${escapeXml(localizedUrl(entry.pathname, locale))}</loc>${lastmod}${alternates(entry.pathname)}</url>`
  })
}

/** The `sitemap.xml`: canonical and indexable URLs only, one entry per language. */
export function sitemapXml(entries: ReadonlyArray<SitemapEntry>): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.flatMap(urls),
    '</urlset>',
  ].join('\n')
}

type RobotsInput = Readonly<{
  /** Only production is indexable: the rest answers `Disallow: /`. */
  indexable: boolean
}>

/** The `robots.txt`: the sitemap's absolute URL depends on the environment, which is why it is a route. */
export function robotsTxt({ indexable }: RobotsInput): string {
  if (!indexable) return 'User-agent: *\nDisallow: /\n'

  return `User-agent: *\nDisallow:\n\nSitemap: ${env.VITE_SITE_URL}/sitemap.xml\n`
}
