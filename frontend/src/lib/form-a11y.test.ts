import { describe, expect, it } from 'vitest'

import { errorId, invalidProps } from './form-a11y'

describe('errorId', () => {
  it('deriva o id da mensagem do id do campo', () => {
    expect(errorId('email')).toBe('email-error')
  })
})

describe('invalidProps', () => {
  it('campo válido não aponta para erro nenhum', () => {
    expect(invalidProps(false, 'email')).toEqual({ 'aria-invalid': false })
  })

  it('campo inválido aponta para a mensagem de erro', () => {
    expect(invalidProps(true, 'email')).toEqual({
      'aria-invalid': true,
      'aria-describedby': 'email-error',
    })
  })
})
