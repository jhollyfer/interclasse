import { describe, expect, it } from 'vitest'

import { AuthenticationSessionSignInValidator } from './sessions.validator.js'

describe('AuthenticationSessionSignInValidator', () => {
  it('accepts a valid e-mail with any non-empty password', () => {
    const result = AuthenticationSessionSignInValidator.safeParse({
      email: 'ana@mail.com',
      password: 'x',
    })

    expect(result.success).toBe(true)
  })

  it('refuses an empty password before it reaches the server', () => {
    const result = AuthenticationSessionSignInValidator.safeParse({
      email: 'ana@mail.com',
      password: '',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['password'])
  })
})
