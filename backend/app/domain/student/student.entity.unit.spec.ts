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
  test('nasce com o nome aparado e a edição carimbada', ({ assert }) => {
    const created = Student.create({ id: 'id', classroomId: 'c', name: '  Bia  ', now: NOW })

    if (created.isLeft()) throw new Error('aluno recusado')
    assert.deepInclude(created.value.snapshot(), {
      name: 'Bia',
      classroomId: 'c',
      updatedAt: NOW,
    })
  })

  test('recusa nome em branco ao nascer e ao renomear', ({ assert }) => {
    const born = Student.create({ id: 'id', classroomId: 'c', name: '   ', now: NOW })
    const student = ana()
    const renamed = student.rename('', LATER)

    assert.deepEqual(born.value, { code: 'STUDENT_NAME_EMPTY' })
    assert.deepEqual(renamed.value, { code: 'STUDENT_NAME_EMPTY' })
    assert.equal(student.snapshot().name, 'Ana')
  })

  test('renomear troca o nome e carimba a edição', ({ assert }) => {
    const student = ana()
    student.rename(' Ana Clara ', LATER)

    assert.deepInclude(student.snapshot(), { name: 'Ana Clara', updatedAt: LATER })
  })

  test('não sai da turma se joga numa modalidade já sorteada', ({ assert }) => {
    assert.isTrue(ana().remove({ inDrawnSport: false }).isRight())
    assert.deepEqual(ana().remove({ inDrawnSport: true }).value, {
      code: 'STUDENT_IN_COMPETITION',
    })
  })
})
