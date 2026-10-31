import { describe, expect, it } from 'vitest'

import { blankToNull, blankToUndefined, nanToNull } from './form-values'

describe('form-values', () => {
  it('turns blank text into null, passes the rest', () => {
    expect(blankToNull('')).toBeNull()
    expect(blankToNull('   ')).toBeNull()
    expect(blankToNull('Futsal')).toBe('Futsal')
  })

  it('turns empty text into absent, passes the rest', () => {
    expect(blankToUndefined('')).toBeUndefined()
    expect(blankToUndefined('abc')).toBe('abc')
  })

  it('turns NaN into null, passes a number, zero included', () => {
    expect(nanToNull(Number.NaN)).toBeNull()
    expect(nanToNull(0)).toBe(0)
  })
})
