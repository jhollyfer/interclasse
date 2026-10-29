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
})
