import { describe, expect, it } from 'vitest'

import { Slug } from './slug.js'

describe('Slug', () => {
  it('strips accents, spaces and punctuation, in lower case', () => {
    expect(Slug.from('Tênis de mesa').value).toBe('tenis-de-mesa')
    expect(Slug.from('  Vôlei!! ').value).toBe('volei')
    expect(Slug.from('Jogos eletrônicos').value).toBe('jogos-eletronicos')
  })

  it('cuts at the ceiling without leaving a trailing hyphen', () => {
    const slug = Slug.from(`${'a'.repeat(254)} b`)
    expect(slug.value.length).toBeLessThanOrEqual(Slug.MAX_LENGTH)
    expect(slug.value.endsWith('-')).toBe(false)
  })

  it('compares by value', () => {
    expect(Slug.from('Futsal').equals(Slug.from('futsal'))).toBe(true)
  })
})
