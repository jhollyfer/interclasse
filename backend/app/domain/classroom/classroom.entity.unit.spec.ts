import { test } from '@japa/runner'

import { Classroom } from './classroom.entity.ts'

const NOW = new Date('2026-10-29T12:00:00Z')
const LATER = new Date('2026-10-30T12:00:00Z')
const FREE = { exists: true, taken: false }

function sevenA(): Classroom {
  return Classroom.restore({
    id: 'classroom',
    name: '7º A',
    grade: 7,
    category: 'F2',
    advisorId: 'advisor-1',
    representativeId: null,
    createdAt: NOW,
    updatedAt: null,
  })
}

test.group('Classroom', () => {
  test('the category comes from the grade: up to the 5th is F1, after that F2', ({ assert }) => {
    assert.equal(Classroom.categoryOf(3), 'F1')
    assert.equal(Classroom.categoryOf(5), 'F1')
    assert.equal(Classroom.categoryOf(6), 'F2')
    assert.equal(Classroom.categoryOf(9), 'F2')
  })

  test('is born with the derived category and the edit stamped', ({ assert }) => {
    const created = Classroom.create({ id: 'id', name: '4º B', grade: 4, now: NOW }, {})

    if (created.isLeft()) throw new Error('classroom refused')
    assert.deepInclude(created.value.snapshot(), {
      category: 'F1',
      advisorId: null,
      representativeId: null,
      updatedAt: NOW,
    })
  })

  test('refuses a grade outside 3rd to 9th on birth and on change', ({ assert }) => {
    const born = Classroom.create({ id: 'id', name: '2º A', grade: 2, now: NOW }, {})
    const changed = sevenA().update({ grade: 10 }, { facts: {}, inCompetition: false, now: LATER })

    assert.deepEqual(born.value, { code: 'CLASSROOM_INVALID_GRADE' })
    assert.deepEqual(changed.value, { code: 'CLASSROOM_INVALID_GRADE' })
  })

  test('advisor: a nonexistent account or one without the role is ADVISOR_NOT_FOUND', ({
    assert,
  }) => {
    const missing = Classroom.create(
      { id: 'id', name: '4º B', grade: 4, advisorId: 'x', now: NOW },
      {},
    )
    const wrongRole = Classroom.create(
      { id: 'id', name: '4º B', grade: 4, advisorId: 'x', now: NOW },
      { advisor: { exists: false, taken: false } },
    )

    assert.deepEqual(missing.value, { code: 'ADVISOR_NOT_FOUND' })
    assert.deepEqual(wrongRole.value, { code: 'ADVISOR_NOT_FOUND' })
  })

  test('an advisor and a representative already linked to another classroom are refused', ({
    assert,
  }) => {
    const advisor = Classroom.create(
      { id: 'id', name: '4º B', grade: 4, advisorId: 'x', now: NOW },
      { advisor: { exists: true, taken: true } },
    )
    const representative = Classroom.create(
      { id: 'id', name: '4º B', grade: 4, representativeId: 'y', now: NOW },
      { representative: { exists: true, taken: true } },
    )
    const missingRepresentative = Classroom.create(
      { id: 'id', name: '4º B', grade: 4, representativeId: 'y', now: NOW },
      {},
    )

    assert.deepEqual(advisor.value, { code: 'ADVISOR_TAKEN' })
    assert.deepEqual(representative.value, { code: 'REPRESENTATIVE_TAKEN' })
    assert.deepEqual(missingRepresentative.value, { code: 'REPRESENTATIVE_NOT_FOUND' })
  })

  test('on edit only the link that changed is checked', ({ assert }) => {
    const classroom = sevenA()

    assert.deepEqual(classroom.changedLinks({ advisorId: 'advisor-1' }), {})
    assert.deepEqual(classroom.changedLinks({ advisorId: null, representativeId: null }), {})
    assert.deepEqual(classroom.changedLinks({ advisorId: 'advisor-2', representativeId: 'r' }), {
      advisorId: 'advisor-2',
      representativeId: 'r',
    })

    const kept = classroom.update(
      { name: '7º A2', advisorId: 'advisor-1' },
      { facts: { advisor: { exists: true, taken: true } }, inCompetition: false, now: LATER },
    )
    assert.isTrue(kept.isRight())
  })

  test('changing advisor checks the new account; null undoes the link', ({ assert }) => {
    const refused = sevenA().update(
      { advisorId: 'advisor-2' },
      { facts: { advisor: { exists: true, taken: true } }, inCompetition: false, now: LATER },
    )
    const classroom = sevenA()
    const unlinked = classroom.update(
      { advisorId: null },
      { facts: {}, inCompetition: false, now: LATER },
    )
    const linked = classroom.update(
      { representativeId: 'rep' },
      { facts: { representative: FREE }, inCompetition: false, now: LATER },
    )

    assert.deepEqual(refused.value, { code: 'ADVISOR_TAKEN' })
    assert.isTrue(unlinked.isRight() && linked.isRight())
    assert.deepInclude(classroom.snapshot(), { advisorId: null, representativeId: 'rep' })
  })

  test('changing the year to another category recalculates the category', ({ assert }) => {
    const classroom = sevenA()
    const result = classroom.update({ grade: 5 }, { facts: {}, inCompetition: false, now: LATER })

    assert.isTrue(result.isRight())
    assert.deepInclude(classroom.snapshot(), { grade: 5, category: 'F1', updatedAt: LATER })
  })

  test('a drawn classroom does not change category, but changes grade within it', ({ assert }) => {
    const classroom = sevenA()
    const refused = classroom.update({ grade: 5 }, { facts: {}, inCompetition: true, now: LATER })
    const same = classroom.update({ grade: 8 }, { facts: {}, inCompetition: true, now: LATER })

    assert.deepEqual(refused.value, { code: 'CLASSROOM_CATEGORY_LOCKED' })
    assert.equal(classroom.snapshot().grade, 8)
    assert.isTrue(same.isRight())
  })

  test('left changes nothing', ({ assert }) => {
    const classroom = sevenA()
    classroom.update({ name: 'outra', grade: 5 }, { facts: {}, inCompetition: true, now: LATER })

    assert.deepInclude(classroom.snapshot(), { name: '7º A', grade: 7, updatedAt: null })
  })

  test('only deletes without a team in a bracket', ({ assert }) => {
    assert.isTrue(sevenA().remove({ inCompetition: false }).isRight())
    assert.deepEqual(sevenA().remove({ inCompetition: true }).value, {
      code: 'CLASSROOM_IN_COMPETITION',
    })
  })

  test('renamesTo and changesCategoryWith say whether it is worth checking', ({ assert }) => {
    const classroom = sevenA()

    assert.isFalse(classroom.renamesTo(undefined))
    assert.isFalse(classroom.renamesTo('7º A'))
    assert.isTrue(classroom.renamesTo('7º B'))
    assert.isFalse(classroom.changesCategoryWith(undefined))
    assert.isFalse(classroom.changesCategoryWith(9))
    assert.isTrue(classroom.changesCategoryWith(4))
  })
})
