import { describe, expect, it } from 'vitest'
import { optionalNumber, slugify } from './utils'

describe('slugify', () => {
  it('remove acento em vez de trocar a letra por hífen', () => {
    expect(slugify('Notícia de Educação')).toBe('noticia-de-educacao')
  })

  it('colapsa pontuação e espaço em um hífen só', () => {
    expect(slugify('Evento  ,  Comunidade!')).toBe('evento-comunidade')
  })

  it('traduz o & como o backend traduz', () => {
    // O `string.slug` do AdonisJS tem tabela de símbolos, e quem grava é ele.
    // Divergir aqui faz a tela prometer um endereço e a vitrine servir outro.
    expect(slugify('Esporte  &  Cultura!')).toBe('esporte-and-cultura')
  })

  it('não passa do teto da coluna', () => {
    expect(slugify('%'.repeat(200))).toHaveLength(0)
    expect(slugify('a'.repeat(600))).toHaveLength(512)
  })

  it('não deixa hífen sobrando nas pontas', () => {
    expect(slugify('  --Óleos Vegetais--  ')).toBe('oleos-vegetais')
  })

  it('devolve string vazia quando não sobra nada', () => {
    expect(slugify('---')).toBe('')
  })
})

describe('optionalNumber', () => {
  it('trata campo esvaziado como ausente em vez de zero', () => {
    expect(optionalNumber('')).toBeUndefined()
  })

  it('converte o que foi digitado', () => {
    expect(optionalNumber('5')).toBe(5)
  })

  it('preserva o zero digitado de propósito', () => {
    expect(optionalNumber('0')).toBe(0)
  })
})
