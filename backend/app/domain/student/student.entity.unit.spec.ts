import { test } from '@japa/runner'

import { Student } from './student.entity.ts'

const NOW = new Date('2026-10-29T12:00:00Z')
const LATER = new Date('2026-10-30T12:00:00Z')

function ana(): Student {
  return Student.restore({
    id: 'ana',
    classroomId: 'classroom',
    name: 'Ana',
    createdAt: NOW,
    updatedAt: null,
  })
}

test.group('Student', () => {
  test('is born with the name trimmed and the edit stamped', ({ assert }) => {
    const created = Student.create({ id: 'id', classroomId: 'c', name: '  Bia  ', now: NOW })

    if (created.isLeft()) throw new Error('student refused')
    assert.deepInclude(created.value.snapshot(), {
      name: 'Bia',
      classroomId: 'c',
      updatedAt: NOW,
    })
  })

  test('refuses a blank name on birth and on rename', ({ assert }) => {
    const born = Student.create({ id: 'id', classroomId: 'c', name: '   ', now: NOW })
    const student = ana()
    const renamed = student.rename('', LATER)

    assert.deepEqual(born.value, { code: 'STUDENT_NAME_EMPTY' })
    assert.deepEqual(renamed.value, { code: 'STUDENT_NAME_EMPTY' })
    assert.equal(student.snapshot().name, 'Ana')
  })

  test('renaming changes the name and stamps the edit', ({ assert }) => {
    const student = ana()
    student.rename(' Ana Clara ', LATER)

    assert.deepInclude(student.snapshot(), { name: 'Ana Clara', updatedAt: LATER })
  })

  test('does not leave the classroom if they play in an already drawn sport', ({ assert }) => {
    assert.isTrue(ana().remove({ inDrawnSport: false }).isRight())
    assert.deepEqual(ana().remove({ inDrawnSport: true }).value, {
      code: 'STUDENT_IN_COMPETITION',
    })
  })
})
