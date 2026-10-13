import { describe, expect, it } from 'vitest'

import { fieldsOf } from '#/lib/validator.test-utils'

import { SportCreateValidator } from './sports.validator'

function sport(overrides: Record<string, unknown> = {}) {
  return SportCreateValidator.tryValidate({
    name: 'Futsal',
    minAthletes: 5,
    maxAthletes: 12,
    ...overrides,
  })
}

describe('SportCreateValidator', () => {
  it('recusa atletas fora de 1 a 40 e fracionários', async () => {
    const [error] = await sport({ minAthletes: 0, maxAthletes: 4.5 })

    expect(fieldsOf(error).sort()).toEqual(['maxAthletes', 'minAthletes'])
  })
})
