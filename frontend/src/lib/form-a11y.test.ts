import { describe, expect, it } from 'vitest'

import { errorId, invalidProps } from './form-a11y'

describe('errorId', () => {
  it('derives the message id from the field id', () => {
    expect(errorId('email')).toBe('email-error')
  })
})

describe('invalidProps', () => {
  it('when the field is valid, points at no error', () => {
    expect(invalidProps(false, 'email')).toEqual({ 'aria-invalid': false })
  })

  it('when the field is invalid, points at the error message', () => {
    expect(invalidProps(true, 'email')).toEqual({
      'aria-invalid': true,
      'aria-describedby': 'email-error',
    })
  })
})
