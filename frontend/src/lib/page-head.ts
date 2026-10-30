import logo512 from '#/assets/logo-512.png'
import { env } from '#/env'
import { m } from '#/paraglide/messages'
import { getLocale, locales, localizeUrl } from '#/paraglide/runtime'
import type { Locale } from '#/paraglide/runtime'

/** O `og:locale` de cada idioma da casa (`language_TERRITORY`). */
const OG_LOCALES = {
  'pt-BR': 'pt_BR',
  es: 'es_ES',
  en: 'en_US',
} satisfies Record<Locale, string>

/** A imagem do cartão do link: a logo dos jogos. */
const OG_IMAGE = new URL(logo512, env.VITE_SITE_URL).href

type PageHeadInput = Readonly<{
  /** O assunto da página; o sufixo do site é somado aqui. Ausente, vale só o nome do site. */
  title?: string
  /** Ausente, vale a descrição do site. */
  description?: string
  /** O caminho sem prefixo de idioma e sem query, como o router o enxerga (`/jogos`). */
  pathname: string
  /** Página fora do índice dos buscadores (404). */
  noindex?: boolean
}>

/** A URL absoluta da página no idioma pedido (`localizeUrl` devolve `URL`). */
export function localizedUrl(pathname: string, locale: Locale): string {
  const url = localizeUrl(new URL(pathname, env.VITE_SITE_URL), { locale })
  // `/es/` e `/es` são o mesmo endereço, e o site responde na forma sem barra.
  if (url.pathname.length > 1 && url.pathname.endsWith('/'))
    url.pathname = url.pathname.slice(0, -1)

  return url.href
}

/**
 * O `head` de uma página pública (`_standards/frontend.md` §9.7): título com o
 * sufixo do site, descrição, canonical do idioma atual, `hreflang` recíproco
 * das três versões mais `x-default` (a de `pt-BR`) e Open Graph.
 *
 * Título e descrição já chegam traduzidos pela rota (`m.*()`), e o idioma é o
 * da requisição: o `head` roda no SSR dentro do contexto do `paraglideMiddleware`.
 *
 * _doc-lib/paraglide.md#/runtime (`localizeUrl`),
 * _doc-lib/tanstack-router.md#guide/document-head-management.
 */
export function pageHead({
  title,
  description = m.common_site_description(),
  pathname,
  noindex = false,
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

  return { meta, links }
}

/** O meta `robots` de página fora do índice. `indexable` ausente ou `true` não gera nada. */
export function noindexMeta(
  indexable: boolean | undefined,
): Array<{ name: string; content: string }> {
  if (indexable !== false) return []

  return [{ name: 'robots', content: 'noindex, nofollow' }]
}

/** JSON-LD escrito para `<script>`: o `<` escapado impede fechar a tag por dentro. */
export function jsonLd(data: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c')
}

/** A `Organization` da raiz (`frontend.md` §9.7). */
export function organizationJsonLd(): string {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: m.common_site_title(),
    url: env.VITE_SITE_URL,
    logo: OG_IMAGE,
  })
}
