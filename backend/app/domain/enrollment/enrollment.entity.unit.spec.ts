import { test } from '@japa/runner'

import { Enrollment, type EnrollmentWriter } from './enrollment.entity.ts'

const ADVISOR = { role: 'advisor', reason: 'Mudou de turno' } satisfies EnrollmentWriter
const REPRESENTATIVE = { role: 'representative' } satisfies EnrollmentWriter
const CLASSROOM = ['a', 'b', 'c']

function roster(studentIds: string[]): Enrollment {
  return Enrollment.restore({ classroomId: 'classroom', sportId: 'sport', studentIds })
}

function context(overrides: { maxAthletes?: number; drawn?: boolean } = {}) {
  return {
    maxAthletes: overrides.maxAthletes ?? 5,
    classroomStudentIds: CLASSROOM,
    drawn: overrides.drawn ?? false,
  }
}

test.group('Enrollment', () => {
  test('replaces the whole list and returns who left', ({ assert }) => {
    const enrollment = roster(['a', 'b'])

    const result = enrollment.replace({ studentIds: ['b', 'c'], writer: ADVISOR }, context())

    assert.deepEqual(result.value, { removedStudentIds: ['a'] })
    assert.deepEqual(enrollment.snapshot().studentIds, ['b', 'c'])
  })

  test('above the sport maximum is ENROLLMENT_LIMIT_EXCEEDED', ({ assert }) => {
    const result = roster([]).replace(
      { studentIds: ['a', 'b'], writer: ADVISOR },
      context({ maxAthletes: 1 }),
    )

    assert.deepEqual(result.value, { code: 'ENROLLMENT_LIMIT_EXCEEDED', maxAthletes: 1 })
  })

  test('the maximum counts equally: a list at the limit passes', ({ assert }) => {
    const result = roster([]).replace(
      { studentIds: ['a', 'b'], writer: ADVISOR },
      context({ maxAthletes: 2 }),
    )

    assert.isTrue(result.isRight())
  })

  test('a student from outside the classroom is refused and the list stays as it was', ({
    assert,
  }) => {
    const enrollment = roster(['a'])

    const result = enrollment.replace({ studentIds: ['a', 'alheio'], writer: ADVISOR }, context())

    assert.deepEqual(result.value, { code: 'ENROLLMENT_STUDENT_NOT_IN_CLASSROOM' })
    assert.deepEqual(enrollment.snapshot().studentIds, ['a'])
  })

  test('the representative only adds', ({ assert }) => {
    const added = roster(['a']).replace(
      { studentIds: ['a', 'b'], writer: REPRESENTATIVE },
      context(),
    )
    const removing = roster(['a', 'b']).replace(
      { studentIds: ['a'], writer: REPRESENTATIVE },
      context(),
    )

    assert.deepEqual(added.value, { removedStudentIds: [] })
    assert.deepEqual(removing.value, { code: 'ENROLLMENT_REMOVAL_FORBIDDEN' })
  })

  test("after the draw the representative's list locks", ({ assert }) => {
    const result = roster([]).replace(
      { studentIds: ['a'], writer: REPRESENTATIVE },
      context({ drawn: true }),
    )

    assert.deepEqual(result.value, { code: 'ENROLLMENT_LOCKED' })
  })

  test('the advisor changes it after the draw', ({ assert }) => {
    const result = roster(['a']).replace(
      { studentIds: ['b'], writer: ADVISOR },
      context({ drawn: true }),
    )

    assert.isTrue(result.isRight())
  })

  test('removing an athlete without a reason is ENROLLMENT_REASON_REQUIRED', ({ assert }) => {
    const enrollment = roster(['a'])

    const result = enrollment.replace({ studentIds: [], writer: { role: 'advisor' } }, context())

    assert.deepEqual(result.value, { code: 'ENROLLMENT_REASON_REQUIRED' })
    assert.deepEqual(enrollment.snapshot().studentIds, ['a'])
  })

  test('with nobody leaving, the reason is not required', ({ assert }) => {
    const result = roster(['a']).replace(
      { studentIds: ['a', 'b'], writer: { role: 'advisor' } },
      context(),
    )

    assert.isTrue(result.isRight())
  })

  test('refusals follow the screen order: limit before foreign student', ({ assert }) => {
    const result = roster([]).replace(
      { studentIds: ['x', 'y'], writer: REPRESENTATIVE },
      context({ maxAthletes: 1, drawn: true }),
    )

    assert.deepEqual(result.value, { code: 'ENROLLMENT_LIMIT_EXCEEDED', maxAthletes: 1 })
  })
})
