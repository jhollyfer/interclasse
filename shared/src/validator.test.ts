import { describe, expect, it } from 'vitest'

import { LOCALES } from './enums/locale.js'
import { VALIDATION_MESSAGES, useValidatorLocale, z } from './validator.js'

describe('validator', () => {
  it('toda mensagem da casa existe nos três idiomas e sem travessão', () => {
    for (const locale of LOCALES) {
      for (const message of Object.values(VALIDATION_MESSAGES[locale])) {
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
})
