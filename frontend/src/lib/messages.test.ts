import { describe, expect, it } from 'vitest'

import en from '../../messages/en.json'
import es from '../../messages/es.json'
import ptBR from '../../messages/pt-BR.json'

/**
 * What belongs to the house in the message files (`_standards/i18n.md` §4). The rest
 * (missing translation, unknown variable, plural) belongs to `inlang check`.
 */
const FILES = { 'pt-BR': ptBR, es, en }

/** A message's texts, including those of the plural variants. */
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
    '%s has no em dash nor "..." in any value',
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
  ])('%s has the same key set as pt-BR', (_locale, file) => {
    expect(keysOf(file)).toEqual(keysOf(ptBR))
  })
})
