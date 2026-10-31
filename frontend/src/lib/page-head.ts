import logo512 from '#/assets/logo-512.png'
import { env } from '#/env'
import { schoolDateTime } from '#/lib/i18n'
import { m } from '#/paraglide/messages'
import { getLocale, locales, localizeUrl } from '#/paraglide/runtime'
import type { Locale } from '#/paraglide/runtime'

/** The `og:locale` of each house language (`language_TERRITORY`). */
const OG_LOCALES = {
  'pt-BR': 'pt_BR',
  es: 'es_ES',
  en: 'en_US',
} satisfies Record<Locale, string>

/** The link card image: the games logo. */
const OG_IMAGE = new URL(logo512, env.VITE_SITE_URL).href

type PageHeadInput = Readonly<{
  /** The page's subject; the site suffix is added here. When absent, only the site name applies. */
  title?: string
  /** When absent, the site description applies. */
  description?: string
  /** The path without language prefix and without query, as the router sees it (`/matches`). */
  pathname: string
  /** A page outside the search engines' index (404). */
  noindex?: boolean
  /** JSON-LD blocks already serialized by `jsonLd()` (`BreadcrumbList`, domain type). */
  structuredData?: ReadonlyArray<string>
}>

/** A step of the structured trail: the translated name and the path without language. */
export type BreadcrumbItem = Readonly<{ name: string; pathname: string }>

/** A bracket's sports event, from what the route already loaded. */
export type SportsEventInput = Readonly<{
  name: string
  description: string
  sport: string
  pathname: string
  /** Each match's time, ISO 8601; the earliest becomes `startDate`, and without any the field is omitted. */
  scheduledAt: ReadonlyArray<string | null>
}>

/** The page's absolute URL in the requested language (`localizeUrl` returns `URL`). */
export function localizedUrl(pathname: string, locale: Locale): string {
  const url = localizeUrl(new URL(pathname, env.VITE_SITE_URL), { locale })
  // `/es/` and `/es` are the same address, and the site answers in the form without a slash.
  if (url.pathname.length > 1 && url.pathname.endsWith('/'))
    url.pathname = url.pathname.slice(0, -1)

  return url.href
}

/**
 * A public page's `head` (`_standards/frontend.md` §9.7): title with the site
 * suffix, description, canonical of the current language, reciprocal `hreflang`
 * of the three versions plus `x-default` (the `pt-BR` one) and Open Graph.
 *
 * Title and description already arrive translated from the route (`m.*()`), and the language is
 * the request's: `head` runs on SSR inside the `paraglideMiddleware` context.
 *
 * _doc-lib/paraglide.md#/runtime (`localizeUrl`),
 * _doc-lib/tanstack-router.md#guide/document-head-management.
 */
export function pageHead({
  title,
  description = m.common_site_description(),
  pathname,
  noindex = false,
  structuredData = [],
}: PageHeadInput) {
  const siteTitle = m.common_site_title()
  let fullTitle: string = siteTitle
  if (title) fullTitle = `${title} | ${siteTitle}`

  const locale = getLocale()
  const canonical = localizedUrl(pathname, locale)

  const meta = [
    { title: fullTitle },
    { name: 'description', content: description },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:image', content: OG_IMAGE },
    { property: 'og:url', content: canonical },
    { property: 'og:locale', content: OG_LOCALES[locale] },
  ]
  if (noindex) meta.push(...noindexMeta(false))

  const links = [
    { rel: 'canonical', href: canonical },
    ...locales.map((item) => ({
      rel: 'alternate',
      hrefLang: item,
      href: localizedUrl(pathname, item),
    })),
    {
      rel: 'alternate',
      hrefLang: 'x-default',
      href: localizedUrl(pathname, 'pt-BR'),
    },
  ]

  const scripts = structuredData.map((children) => ({
    type: 'application/ld+json',
    children,
  }))

  return { meta, links, scripts }
}

/** The `robots` meta of a page outside the index. `indexable` absent or `true` generates nothing. */
export function noindexMeta(
  indexable: boolean | undefined,
): Array<{ name: string; content: string }> {
  if (indexable !== false) return []

  return [{ name: 'robots', content: 'noindex, nofollow' }]
}

/** JSON-LD written for `<script>`: the escaped `<` prevents closing the tag from the inside. */
export function jsonLd(data: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c')
}

/** The root's `Organization` (`frontend.md` §9.7). */
export function organizationJsonLd(): string {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: m.common_site_title(),
    url: env.VITE_SITE_URL,
    logo: OG_IMAGE,
  })
}

/** A `BreadcrumbList` do detalhe (`frontend.md` §9.7): URLs absolutas no idioma atual. */
export function breadcrumbJsonLd(items: ReadonlyArray<BreadcrumbItem>): string {
  const locale = getLocale()

  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: localizedUrl(item.pathname, locale),
    })),
  })
}

/** A bracket's `SportsEvent` (`frontend.md` §9.7, domain type). */
export function sportsEventJsonLd({
  name,
  description,
  sport,
  pathname,
  scheduledAt,
}: SportsEventInput): string {
  const event: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name,
    description,
    sport,
    url: localizedUrl(pathname, getLocale()),
    organizer: { '@type': 'Organization', name: m.common_site_title() },
  }
  const [first] = scheduledAt
    .flatMap((value) => {
      if (value === null) return []

      return [schoolDateTime(value)]
    })
    .sort((a, b) => a.toMillis() - b.toMillis())
  if (first) event.startDate = first.toISO()

  return jsonLd(event)
}
