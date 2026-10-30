import { describe, expect, it } from 'vitest'

import { Slug } from './slug.js'

describe('Slug', () => {
  it('tira acento, espaço e pontuação, em minúscula', () => {
    expect(Slug.from('Tênis de mesa').value).toBe('tenis-de-mesa')
    expect(Slug.from('  Vôlei!! ').value).toBe('volei')
    expect(Slug.from('Jogos eletrônicos').value).toBe('jogos-eletronicos')
  })

  it('corta no teto sem deixar hífen no fim', () => {
    const slug = Slug.from(`${'a'.repeat(254)} b`)
    expect(slug.value.length).toBeLessThanOrEqual(Slug.MAX_LENGTH)
    expect(slug.value.endsWith('-')).toBe(false)
  })

  it('compara pelo valor', () => {
    expect(Slug.from('Futsal').equals(Slug.from('futsal'))).toBe(true)
  })
})
