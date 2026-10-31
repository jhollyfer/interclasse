import { describe, expect, it } from 'vitest'

import { LOCALES, type Locale } from './enums/locale.js'
import { VALIDATION_MESSAGES, useValidatorLocale, z } from './validator.js'

/** Each house message of a language, the parameterized ones already filled in. */
function validationTexts(locale: Locale): string[] {
  const messages = VALIDATION_MESSAGES[locale]

  return [
    messages.required,
    messages.option,
    messages.number,
    messages.integer,
    messages.email,
    messages.minLength(3),
    messages.maxLength(3),
    messages.min(3),
    messages.max(3),
    messages.maxItems(3),
  ]
}

describe('validator', () => {
  it('every house message exists in the three languages and has no em dash', () => {
    for (const locale of LOCALES) {
      for (const message of validationTexts(locale)) {
        expect(message.trim()).not.toBe('')
        expect(message).not.toMatch(/[—–]|\.\.\./)
      }
    }
  })

  it('empty required text uses the house message in the chosen language', () => {
    const schema = z.object({ name: z.string().trim().min(1) })

    for (const locale of LOCALES) {
      useValidatorLocale(locale)
      const result = schema.safeParse({ name: '' })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe(
        VALIDATION_MESSAGES[locale].required,
      )
    }

    useValidatorLocale('pt-BR')
  })

  it('the other rules come from the Zod locale in the chosen language', () => {
    // The message is read before switching again: Zod resolves it in the language
    // configured at validation time.
    useValidatorLocale('en')
    const english = z.string().max(2).safeParse('abc').error?.issues[0]?.message
    useValidatorLocale('pt-BR')
    const portuguese = z.string().max(2).safeParse('abc').error
      ?.issues[0]?.message

    expect(english).not.toBe(portuguese)
  })

  it('missing field, erased number, invalid id and enum have a house message', () => {
    const schema = z.object({
      name: z.string(),
      amount: z.number(),
      id: z.uuid(),
      kind: z.enum(['A', 'B']),
      email: z.email(),
    })
    const issues = schema.safeParse({
      amount: Number.NaN,
      id: '',
      kind: 'C',
      email: '',
    }).error?.issues
    const messages = Object.fromEntries(
      (issues ?? []).map((i) => [i.path.join('.'), i.message]),
    )
    const texts = VALIDATION_MESSAGES['pt-BR']

    expect(messages).toEqual({
      name: texts.required,
      amount: texts.number,
      id: texts.option,
      kind: texts.option,
      email: texts.required,
    })
  })

  it('text, number and list limits use the house phrase in the three languages', () => {
    const schema = z.object({
      short: z.string().min(3),
      long: z.string().max(2),
      low: z.number().min(3),
      high: z.number().max(3),
      whole: z.number().int(),
      email: z.email(),
      items: z.array(z.string()).max(1),
    })
    const input = {
      short: 'a',
      long: 'abc',
      low: 1,
      high: 5,
      whole: 1.5,
      email: 'x',
      items: ['a', 'b'],
    }

    for (const locale of LOCALES) {
      useValidatorLocale(locale)
      const texts = VALIDATION_MESSAGES[locale]
      const issues = schema.safeParse(input).error?.issues ?? []
      const messages = Object.fromEntries(
        issues.map((i) => [i.path.join('.'), i.message]),
      )

      expect(messages).toEqual({
        short: texts.minLength(3),
        long: texts.maxLength(2),
        low: texts.min(3),
        high: texts.max(3),
        whole: texts.integer,
        email: texts.email,
        items: texts.maxItems(1),
      })
    }

    useValidatorLocale('pt-BR')
  })

  it('pt-BR keeps the texts the app already used', () => {
    const texts = VALIDATION_MESSAGES['pt-BR']

    expect(texts.minLength(3)).toBe('Informe ao menos 3 caracteres')
    expect(texts.maxLength(5)).toBe('Informe no máximo 5 caracteres')
    expect(texts.min(1)).toBe('Informe um valor maior ou igual a 1')
    expect(texts.max(9)).toBe('Informe um valor menor ou igual a 9')
    expect(texts.integer).toBe('Informe um número inteiro')
    expect(texts.email).toBe('Informe um e-mail válido')
    expect(texts.maxItems(40)).toBe('Informe no máximo 40 itens')
  })
})
