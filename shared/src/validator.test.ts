import { describe, expect, it } from 'vitest'

import { LOCALES, type Locale } from './enums/locale.js'
import { VALIDATION_MESSAGES, useValidatorLocale, z } from './validator.js'

/** Cada mensagem da casa de um idioma, as com parâmetro já preenchidas. */
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
  it('toda mensagem da casa existe nos três idiomas e sem travessão', () => {
    for (const locale of LOCALES) {
      for (const message of validationTexts(locale)) {
        expect(message.trim()).not.toBe('')
        expect(message).not.toMatch(/[—–]|\.\.\./)
      }
    }
  })

  it('texto obrigatório vazio usa a mensagem da casa no idioma escolhido', () => {
    const schema = z.object({ name: z.string().trim().min(1) })

    for (const locale of LOCALES) {
      useValidatorLocale(locale)
      const result = schema.safeParse({ name: '' })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe(VALIDATION_MESSAGES[locale].required)
    }

    useValidatorLocale('pt-BR')
  })

  it('as outras regras saem do locale do Zod no idioma escolhido', () => {
    // A mensagem é lida antes de trocar de novo: o Zod a resolve no idioma
    // configurado na hora da validação.
    useValidatorLocale('en')
    const english = z.string().max(2).safeParse('abc').error?.issues[0]?.message
    useValidatorLocale('pt-BR')
    const portuguese = z.string().max(2).safeParse('abc').error?.issues[0]?.message

    expect(english).not.toBe(portuguese)
  })

  it('campo sem valor, número apagado, id e enum inválidos têm mensagem da casa', () => {
    const schema = z.object({
      name: z.string(),
      amount: z.number(),
      id: z.uuid(),
      kind: z.enum(['A', 'B']),
      email: z.email(),
    })
    const issues = schema.safeParse({ amount: Number.NaN, id: '', kind: 'C', email: '' }).error
      ?.issues
    const messages = Object.fromEntries((issues ?? []).map((i) => [i.path.join('.'), i.message]))
    const texts = VALIDATION_MESSAGES['pt-BR']

    expect(messages).toEqual({
      name: texts.required,
      amount: texts.number,
      id: texts.option,
      kind: texts.option,
      email: texts.required,
    })
  })

  it('limites de texto, número e lista usam a frase da casa nos três idiomas', () => {
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
      const messages = Object.fromEntries(issues.map((i) => [i.path.join('.'), i.message]))

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

  it('o pt-BR mantém os textos que o app já usava', () => {
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
