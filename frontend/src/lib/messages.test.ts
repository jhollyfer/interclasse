import { describe, expect, it } from 'vitest'

import en from '../../messages/en.json'
import es from '../../messages/es.json'
import ptBR from '../../messages/pt-BR.json'

/**
 * O que é da casa nos arquivos de mensagem (`_standards/i18n.md` §4). O resto
 * (tradução faltando, variável desconhecida, plural) é do `inlang check`.
 */
const FILES = { 'pt-BR': ptBR, es, en }

/** Os textos de uma mensagem, inclusive os das variantes de plural. */
function texts(value: unknown): Array<string> {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(texts)
  if (typeof value === 'object' && value !== null)
    return Object.values(value).flatMap(texts)

  return []
}

function keysOf(file: Record<string, unknown>): Array<string> {
  return Object.keys(file)
    .filter((key) => key !== '$schema')
    .sort()
}

describe('messages', () => {
  it.each(Object.entries(FILES))(
    '%s não tem travessão nem "..." em valor nenhum',
    (_locale, file) => {
      const offenders = Object.entries(file)
        .filter(([key]) => key !== '$schema')
        .filter(([, value]) =>
          texts(value).some((text) => /[—–]|\.\.\./.test(text)),
        )
        .map(([key]) => key)

      expect(offenders).toEqual([])
    },
  )

  it.each([
    ['es', es],
    ['en', en],
  ])('%s tem o mesmo conjunto de chaves do pt-BR', (_locale, file) => {
    expect(keysOf(file)).toEqual(keysOf(ptBR))
  })
})
