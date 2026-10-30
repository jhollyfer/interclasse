import { describe, expect, it } from 'vitest'

import {
  SITEMAP_STATIC_ENTRIES,
  bracketEntries,
  robotsTxt,
  sitemapXml,
} from './sitemap'

describe('bracketEntries', () => {
  it('monta o caminho e leva o updatedAt como lastmod', () => {
    expect(
      bracketEntries([{ id: 'abc', updatedAt: '2026-10-01T10:00:00-04:00' }]),
    ).toEqual([
      {
        pathname: '/classificacao/abc',
        lastModified: '2026-10-01T10:00:00-04:00',
      },
    ])
  })
})

describe('sitemapXml', () => {
  const xml = sitemapXml([
    { pathname: '/jogos' },
    { pathname: '/classificacao/abc', lastModified: '2026-10-01T10:00:00Z' },
  ])

  it('traz uma url por idioma de cada página', () => {
    expect(xml.match(/<url>/g)).toHaveLength(6)
  })

  it('escreve o pt-BR sem prefixo e os outros com prefixo', () => {
    expect(xml).toContain('<loc>http://localhost:3001/jogos</loc>')
    expect(xml).toContain('<loc>http://localhost:3001/es/jogos</loc>')
    expect(xml).toContain('<loc>http://localhost:3001/en/jogos</loc>')
  })

  it('liga cada url aos hreflang das irmãs e ao x-default', () => {
    expect(xml).toContain('hreflang="es" href="http://localhost:3001/es/jogos"')
    expect(xml).toContain(
      'hreflang="x-default" href="http://localhost:3001/jogos"',
    )
  })

  it('só escreve lastmod quando o dado tem updatedAt', () => {
    expect(xml.match(/<lastmod>/g)).toHaveLength(3)
  })
})

describe('SITEMAP_STATIC_ENTRIES', () => {
  it('cobre a home e as páginas públicas', () => {
    expect(SITEMAP_STATIC_ENTRIES.map((entry) => entry.pathname)).toEqual([
      '/',
      '/jogos',
      '/classificacao',
      '/avisos',
      '/sobre',
    ])
  })
})

describe('robotsTxt', () => {
  it('em produção libera tudo e aponta o sitemap absoluto', () => {
    const text = robotsTxt({ indexable: true })

    expect(text).toContain('Disallow:\n')
    expect(text).toContain('Sitemap: http://localhost:3001/sitemap.xml')
  })

  it('fora de produção proíbe tudo', () => {
    expect(robotsTxt({ indexable: false })).toBe('User-agent: *\nDisallow: /\n')
  })
})
