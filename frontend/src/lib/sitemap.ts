import { env } from '#/env'
import { localizedUrl } from '#/lib/page-head'
import { locales } from '#/paraglide/runtime'

/**
 * A lógica pura do `sitemap.xml` e do `robots.txt` (`frontend.md` §9.7). As
 * rotas de servidor (`routes/sitemap[.]xml.ts`, `routes/robots[.]txt.ts`) só
 * buscam os dados e devolvem o texto montado aqui.
 * _doc-lib/tanstack-start.md#guide/server-routes.
 */

/** Uma página indexável: o caminho sem prefixo de idioma e o `updatedAt` do dado. */
export type SitemapEntry = Readonly<{
  pathname: string
  lastModified?: string | null
}>

/** As páginas públicas que não dependem de dado. */
export const SITEMAP_STATIC_ENTRIES = [
  { pathname: '/' },
  { pathname: '/matches' },
  { pathname: '/standings' },
  { pathname: '/announcements' },
  { pathname: '/about' },
] as const satisfies ReadonlyArray<SitemapEntry>

/** A chave de cada modalidade: uma página por chave, com o `updatedAt` dela. */
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

/** Os `xhtml:link` recíprocos das três versões, mais o `x-default` (pt-BR). */
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

/** Uma entrada por idioma, cada uma com os `hreflang` das irmãs. */
function urls(entry: SitemapEntry): Array<string> {
  return locales.map((locale) => {
    let lastmod = ''
    if (entry.lastModified) {
      lastmod = `<lastmod>${escapeXml(entry.lastModified)}</lastmod>`
    }

    return `<url><loc>${escapeXml(localizedUrl(entry.pathname, locale))}</loc>${lastmod}${alternates(entry.pathname)}</url>`
  })
}

/** O `sitemap.xml`: só URL canônica e indexável, uma entrada por idioma. */
export function sitemapXml(entries: ReadonlyArray<SitemapEntry>): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.flatMap(urls),
    '</urlset>',
  ].join('\n')
}

type RobotsInput = Readonly<{
  /** Só produção é indexável: o resto responde `Disallow: /`. */
  indexable: boolean
}>

/** O `robots.txt`: a URL absoluta do sitemap depende do ambiente, por isso é rota. */
export function robotsTxt({ indexable }: RobotsInput): string {
  if (!indexable) return 'User-agent: *\nDisallow: /\n'

  return `User-agent: *\nDisallow:\n\nSitemap: ${env.VITE_SITE_URL}/sitemap.xml\n`
}
