import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { test } from '@japa/runner'

/**
 * A rede de `resources/lang` (_standards/i18n.md §4): os três idiomas têm os
 * mesmos arquivos, as mesmas chaves e os mesmos placeholders, e nenhum texto
 * leva travessão ou reticência de três pontos (§5). O pt-BR é a referência.
 */
const ROOT = join(import.meta.dirname)
const REFERENCE = 'pt-BR'
const OTHERS = ['es', 'en'] as const
const PLACEHOLDER = /\{(\w+)\}/g

type Catalog = ReadonlyMap<string, string>

/** O catálogo de um idioma: `arquivo.chave` → texto. */
function catalogOf(locale: string): Catalog {
  const entries = new Map<string, string>()

  for (const file of readdirSync(join(ROOT, locale)).filter((name) => name.endsWith('.json'))) {
    const content: unknown = JSON.parse(readFileSync(join(ROOT, locale, file), 'utf-8'))
    if (typeof content !== 'object' || content === null) continue

    for (const [key, value] of Object.entries(content))
      if (typeof value === 'string') entries.set(`${file}:${key}`, value)
  }

  return entries
}

/** Os nomes dos placeholders de um texto, em ordem alfabética. */
function placeholdersOf(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((match) => match[1] ?? '').sort()
}

test.group('resources/lang (unit)', () => {
  const reference = catalogOf(REFERENCE)

  for (const locale of OTHERS) {
    const catalog = catalogOf(locale)

    test(`${locale} tem os mesmos arquivos do pt-BR`, ({ assert }) => {
      const files = (name: string) =>
        readdirSync(join(ROOT, name))
          .filter((file) => file.endsWith('.json'))
          .sort()

      assert.deepEqual(files(locale), files(REFERENCE))
    })

    test(`${locale} não tem chave faltando nem sobrando`, ({ assert }) => {
      const missing = [...reference.keys()].filter((key) => !catalog.has(key))
      const extra = [...catalog.keys()].filter((key) => !reference.has(key))

      assert.deepEqual(missing, [])
      assert.deepEqual(extra, [])
    })

    test(`${locale} usa os mesmos placeholders do pt-BR em cada texto`, ({ assert }) => {
      const divergent = [...reference.entries()]
        .filter(([key, text]) => {
          const translated = catalog.get(key)
          if (translated === undefined) return false

          return placeholdersOf(text).join() !== placeholdersOf(translated).join()
        })
        .map(([key]) => key)

      assert.deepEqual(divergent, [])
    })
  }

  for (const locale of [REFERENCE, ...OTHERS]) {
    test(`${locale} não tem texto vazio, travessão nem reticência de três pontos`, ({ assert }) => {
      const offenders = [...catalogOf(locale).entries()]
        .filter(([, text]) => text.trim() === '' || text.includes('—') || text.includes('...'))
        .map(([key]) => key)

      assert.deepEqual(offenders, [])
    })
  }
})
