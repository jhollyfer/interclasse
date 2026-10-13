import { describe, expect, it } from 'vitest'
import { fieldsOf } from '#/lib/validator.test-utils'
import { RepresentativeEnrollmentUpdateValidator } from './enrollments.validator'

describe('RepresentativeEnrollmentUpdateValidator', () => {
  const sportId = '00000000-0000-4000-8000-000000000001'
  const studentId = '00000000-0000-4000-8000-000000000002'

  it('aceita a lista vazia, que tira todo mundo da modalidade', async () => {
    const [error] = await RepresentativeEnrollmentUpdateValidator.tryValidate({
      sportId,
      studentIds: [],
    })

    expect(error).toBeNull()
  })

  it('recusa o mesmo aluno duas vezes', async () => {
    const [error] = await RepresentativeEnrollmentUpdateValidator.tryValidate({
      sportId,
      studentIds: [studentId, studentId],
    })

    expect(fieldsOf(error)).toEqual(['studentIds'])
  })
})
