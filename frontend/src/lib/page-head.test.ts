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
  it('leaves pt-BR without prefix and gives es/en the language prefix', () => {
    expect(localizedUrl('/matches', 'pt-BR')).toBe(
      `${env.VITE_SITE_URL}/matches`,
    )
    expect(localizedUrl('/matches', 'es')).toBe(
      `${env.VITE_SITE_URL}/es/matches`,
    )
    expect(localizedUrl('/matches', 'en')).toBe(
      `${env.VITE_SITE_URL}/en/matches`,
    )
  })

  it('strips the trailing slash, except at the root', () => {
    expect(localizedUrl('/', 'es')).toBe(`${env.VITE_SITE_URL}/es`)
  })
})

describe('pageHead', () => {
  const head = pageHead({ title: 'Jogos', pathname: '/matches' })

  it('puts the site suffix on the title', () => {
    expect(head.meta).toContainEqual({
      title: `Jogos | ${m.common_site_title()}`,
    })
  })

  it('without a title, uses only the site name', () => {
    const bare = pageHead({ pathname: '/' })

    expect(bare.meta).toContainEqual({ title: m.common_site_title() })
  })

  it('declares the canonical and the reciprocal hreflang of the three versions', () => {
    expect(head.links).toContainEqual({
      rel: 'canonical',
      href: `${env.VITE_SITE_URL}/matches`,
    })

    for (const hrefLang of ['pt-BR', 'es', 'en', 'x-default']) {
      expect(head.links.some((link) => link.hrefLang === hrefLang)).toBe(true)
    }
  })

  it('makes x-default point at the pt-BR version', () => {
    const fallback = head.links.find((link) => link.hrefLang === 'x-default')

    expect(fallback?.href).toBe(`${env.VITE_SITE_URL}/matches`)
  })

  it('carries the Open Graph', () => {
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

  it('turns structuredData into an application/ld+json script', () => {
    const withData = pageHead({ pathname: '/x', structuredData: ['{"a":1}'] })

    expect(withData.scripts).toEqual([
      { type: 'application/ld+json', children: '{"a":1}' },
    ])
    expect(head.scripts).toEqual([])
  })

  it('adds robots for noindex, and a normal page does not carry it', () => {
    const hidden = pageHead({ pathname: '/x', noindex: true })

    expect(hidden.meta).toContainEqual({
      name: 'robots',
      content: 'noindex, nofollow',
    })
    expect(JSON.stringify(head.meta)).not.toContain('robots')
  })
})

describe('noindexMeta', () => {
  it('generates robots only when the environment is not indexable', () => {
    expect(noindexMeta(false)).toEqual([
      { name: 'robots', content: 'noindex, nofollow' },
    ])
    expect(noindexMeta(true)).toEqual([])
    expect(noindexMeta(undefined)).toEqual([])
  })
})

describe('jsonLd', () => {
  it('escapes the < so the script tag is not closed from the inside', () => {
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
  it('numbers the steps and uses each one absolute URL', () => {
    const data: unknown = JSON.parse(
      breadcrumbJsonLd([
        { name: 'Início', pathname: '/' },
        { name: 'Classificação', pathname: '/standings' },
      ]),
    )

    expect(data).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, name: 'Início', item: `${env.VITE_SITE_URL}/` },
        {
          position: 2,
          name: 'Classificação',
          item: `${env.VITE_SITE_URL}/standings`,
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
    pathname: '/standings/1',
  }

  it('uses the earliest match as startDate', () => {
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
      url: `${env.VITE_SITE_URL}/standings/1`,
      startDate: '2026-05-01T09:00:00.000-04:00',
    })
  })

  it('when no match is scheduled, omits startDate', () => {
    const text = sportsEventJsonLd({ ...base, scheduledAt: [null] })

    expect(text).not.toContain('startDate')
  })
})
