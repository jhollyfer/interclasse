import { describe, expect, it } from 'vitest'

import { blankToNull, blankToUndefined, nanToNull } from './form-values'

describe('form-values', () => {
  it('texto em branco vira null, o resto passa', () => {
    expect(blankToNull('')).toBeNull()
    expect(blankToNull('   ')).toBeNull()
    expect(blankToNull('Futsal')).toBe('Futsal')
  })

  it('texto vazio vira ausente, o resto passa', () => {
    expect(blankToUndefined('')).toBeUndefined()
    expect(blankToUndefined('abc')).toBe('abc')
  })

  it('NaN vira null, número passa, inclusive zero', () => {
    expect(nanToNull(Number.NaN)).toBeNull()
    expect(nanToNull(0)).toBe(0)
  })
})
