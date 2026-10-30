import { describe, expect, it } from 'vitest'

import { env } from '#/env'
import { m } from '#/paraglide/messages'

import {
  breadcrumbJsonLd,
  jsonLd,
  localizedUrl,
  noindexMeta,
  organizationJsonLd,
  pageHead,
  sportsEventJsonLd,
} from './page-head'

describe('localizedUrl', () => {
  it('pt-BR fica sem prefixo e es/en levam o idioma', () => {
    expect(localizedUrl('/jogos', 'pt-BR')).toBe(`${env.VITE_SITE_URL}/jogos`)
    expect(localizedUrl('/jogos', 'es')).toBe(`${env.VITE_SITE_URL}/es/jogos`)
    expect(localizedUrl('/jogos', 'en')).toBe(`${env.VITE_SITE_URL}/en/jogos`)
  })

  it('tira a barra do fim, menos na raiz', () => {
    expect(localizedUrl('/', 'es')).toBe(`${env.VITE_SITE_URL}/es`)
  })
})

describe('pageHead', () => {
  const head = pageHead({ title: 'Jogos', pathname: '/jogos' })

  it('põe o sufixo do site no título', () => {
    expect(head.meta).toContainEqual({
      title: `Jogos | ${m.common_site_title()}`,
    })
  })

  it('sem título vale só o nome do site', () => {
    const bare = pageHead({ pathname: '/' })

    expect(bare.meta).toContainEqual({ title: m.common_site_title() })
  })

  it('declara o canonical e o hreflang recíproco das três versões', () => {
    expect(head.links).toContainEqual({
      rel: 'canonical',
      href: `${env.VITE_SITE_URL}/jogos`,
    })

    for (const hrefLang of ['pt-BR', 'es', 'en', 'x-default']) {
      expect(head.links.some((link) => link.hrefLang === hrefLang)).toBe(true)
    }
  })

  it('x-default aponta para a versão pt-BR', () => {
    const fallback = head.links.find((link) => link.hrefLang === 'x-default')

    expect(fallback?.href).toBe(`${env.VITE_SITE_URL}/jogos`)
  })

  it('leva o Open Graph', () => {
    const properties = head.meta.flatMap((item) => {
      if ('property' in item) return [item.property]

      return []
    })

    expect(properties).toEqual(
      expect.arrayContaining([
        'og:title',
        'og:description',
        'og:image',
        'og:url',
        'og:locale',
      ]),
    )
  })

  it('structuredData vira script application/ld+json', () => {
    const withData = pageHead({ pathname: '/x', structuredData: ['{"a":1}'] })

    expect(withData.scripts).toEqual([
      { type: 'application/ld+json', children: '{"a":1}' },
    ])
    expect(head.scripts).toEqual([])
  })

  it('noindex acrescenta o robots, e a página normal não leva', () => {
    const hidden = pageHead({ pathname: '/x', noindex: true })

    expect(hidden.meta).toContainEqual({
      name: 'robots',
      content: 'noindex, nofollow',
    })
    expect(JSON.stringify(head.meta)).not.toContain('robots')
  })
})

describe('noindexMeta', () => {
  it('só gera o robots quando o ambiente não é indexável', () => {
    expect(noindexMeta(false)).toEqual([
      { name: 'robots', content: 'noindex, nofollow' },
    ])
    expect(noindexMeta(true)).toEqual([])
    expect(noindexMeta(undefined)).toEqual([])
  })
})

describe('jsonLd', () => {
  it('escapa o < para não fechar a tag script por dentro', () => {
    const text = jsonLd({ name: '</script><b>' })

    expect(text).not.toContain('<')
    expect(text).toContain('\\u003c')
  })

  it('organizationJsonLd descreve a Organization do site', () => {
    const data: unknown = JSON.parse(organizationJsonLd())

    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      url: env.VITE_SITE_URL,
    })
  })
})

describe('breadcrumbJsonLd', () => {
  it('numera os degraus e usa a URL absoluta de cada um', () => {
    const data: unknown = JSON.parse(
      breadcrumbJsonLd([
        { name: 'Início', pathname: '/' },
        { name: 'Classificação', pathname: '/classificacao' },
      ]),
    )

    expect(data).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, name: 'Início', item: `${env.VITE_SITE_URL}/` },
        {
          position: 2,
          name: 'Classificação',
          item: `${env.VITE_SITE_URL}/classificacao`,
        },
      ],
    })
  })
})

describe('sportsEventJsonLd', () => {
  const base = {
    name: 'Futsal Sub-15',
    description: 'Chave de futsal',
    sport: 'Futsal',
    pathname: '/classificacao/1',
  }

  it('usa o jogo mais cedo como startDate', () => {
    const data: unknown = JSON.parse(
      sportsEventJsonLd({
        ...base,
        scheduledAt: [
          null,
          '2026-05-02T10:00:00-04:00',
          '2026-05-01T09:00:00-04:00',
        ],
      }),
    )

    expect(data).toMatchObject({
      '@type': 'SportsEvent',
      sport: 'Futsal',
      url: `${env.VITE_SITE_URL}/classificacao/1`,
      startDate: '2026-05-01T09:00:00.000-04:00',
    })
  })

  it('sem jogo agendado o startDate não sai', () => {
    const text = sportsEventJsonLd({ ...base, scheduledAt: [null] })

    expect(text).not.toContain('startDate')
  })
})
