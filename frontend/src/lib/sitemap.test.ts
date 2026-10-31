import { describe, expect, it } from 'vitest'

import {
  SITEMAP_STATIC_ENTRIES,
  bracketEntries,
  robotsTxt,
  sitemapXml,
} from './sitemap'

describe('bracketEntries', () => {
  it('builds the path and carries updatedAt as lastmod', () => {
    expect(
      bracketEntries([{ id: 'abc', updatedAt: '2026-10-01T10:00:00-04:00' }]),
    ).toEqual([
      {
        pathname: '/standings/abc',
        lastModified: '2026-10-01T10:00:00-04:00',
      },
    ])
  })
})

describe('sitemapXml', () => {
  const xml = sitemapXml([
    { pathname: '/matches' },
    { pathname: '/standings/abc', lastModified: '2026-10-01T10:00:00Z' },
  ])

  it('brings one url per language for each page', () => {
    expect(xml.match(/<url>/g)).toHaveLength(6)
  })

  it('writes pt-BR without a prefix and the others with a prefix', () => {
    expect(xml).toContain('<loc>http://localhost:3001/matches</loc>')
    expect(xml).toContain('<loc>http://localhost:3001/es/matches</loc>')
    expect(xml).toContain('<loc>http://localhost:3001/en/matches</loc>')
  })

  it('links each url to the sibling hreflangs and to x-default', () => {
    expect(xml).toContain(
      'hreflang="es" href="http://localhost:3001/es/matches"',
    )
    expect(xml).toContain(
      'hreflang="x-default" href="http://localhost:3001/matches"',
    )
  })

  it('writes lastmod only when the data has updatedAt', () => {
    expect(xml.match(/<lastmod>/g)).toHaveLength(3)
  })
})

describe('SITEMAP_STATIC_ENTRIES', () => {
  it('covers the home and the public pages', () => {
    expect(SITEMAP_STATIC_ENTRIES.map((entry) => entry.pathname)).toEqual([
      '/',
      '/matches',
      '/standings',
      '/announcements',
      '/about',
    ])
  })
})

describe('robotsTxt', () => {
  it('in production, allows everything and points at the absolute sitemap', () => {
    const text = robotsTxt({ indexable: true })

    expect(text).toContain('Disallow:\n')
    expect(text).toContain('Sitemap: http://localhost:3001/sitemap.xml')
  })

  it('outside production, forbids everything', () => {
    expect(robotsTxt({ indexable: false })).toBe('User-agent: *\nDisallow: /\n')
  })
})
