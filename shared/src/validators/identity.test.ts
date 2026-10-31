import { describe, expect, it } from 'vitest'

import { LOCALES } from '../enums/locale.js'
import { IDENTITY_MESSAGES, useValidatorLocale } from '../validator.js'
import { AccountProfileUpdateValidator } from './account/profile.validator.js'
import { AdministratorUserCreateValidator } from './administrator/users.validator.js'

const VALID = {
  name: 'Ana',
  email: 'ana@mail.com',
  role: 'ADVISOR',
  password: 'Senha@123',
  passwordConfirmation: 'Senha@123',
} as const

describe('identity validators', () => {
  it('accepts the valid account', () => {
    expect(AdministratorUserCreateValidator.safeParse(VALID).success).toBe(true)
  })

  it('weak password and mismatched confirmation use the message of the language in force', () => {
    for (const locale of LOCALES) {
      useValidatorLocale(locale)

      const weak = AdministratorUserCreateValidator.safeParse({
        ...VALID,
        password: 'semsimbolo1A',
        passwordConfirmation: 'semsimbolo1A',
      })
      const mismatch = AdministratorUserCreateValidator.safeParse({
        ...VALID,
        passwordConfirmation: 'Outra@1234',
      })

      expect(weak.error?.issues[0]?.message).toBe(
        IDENTITY_MESSAGES[locale].weakPassword,
      )
      expect(mismatch.error?.issues[0]?.message).toBe(
        IDENTITY_MESSAGES[locale].passwordMismatch,
      )
    }

    useValidatorLocale('pt-BR')
  })

  it('changing the profile password requires the current password', () => {
    const result = AccountProfileUpdateValidator.safeParse({
      password: 'Senha@123',
      passwordConfirmation: 'Senha@123',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['currentPassword'])
  })
})
