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
  test('a categoria sai do ano: até o 5º é F1, depois F2', ({ assert }) => {
    assert.equal(Classroom.categoryOf(3), 'F1')
    assert.equal(Classroom.categoryOf(5), 'F1')
    assert.equal(Classroom.categoryOf(6), 'F2')
    assert.equal(Classroom.categoryOf(9), 'F2')
  })

  test('nasce com a categoria derivada e a edição carimbada', ({ assert }) => {
    const created = Classroom.create({ id: 'id', name: '4º B', grade: 4, now: NOW }, {})

    assert.isTrue(created.isRight())
    assert.deepInclude(created.isRight() ? created.value.snapshot() : {}, {
      category: 'F1',
      advisorId: null,
      representativeId: null,
      updatedAt: NOW,
    })
  })

  test('recusa ano fora do 3º ao 9º ao nascer e ao mudar', ({ assert }) => {
    const born = Classroom.create({ id: 'id', name: '2º A', grade: 2, now: NOW }, {})
    const changed = sevenA().update(
      { grade: 10 },
      { facts: {}, inCompetition: false, now: LATER },
    )

    assert.deepEqual(born.value, { code: 'CLASSROOM_INVALID_GRADE' })
    assert.deepEqual(changed.value, { code: 'CLASSROOM_INVALID_GRADE' })
  })

  test('conselheiro: conta inexistente ou sem o papel é ADVISOR_NOT_FOUND', ({ assert }) => {
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

  test('conselheiro e representante já ligados a outra turma são recusados', ({ assert }) => {
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

  test('na edição só o vínculo que mudou é conferido', ({ assert }) => {
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

  test('troca de conselheiro confere a conta nova; null desfaz o vínculo', ({ assert }) => {
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

  test('mudar o ano para outra categoria recalcula a categoria', ({ assert }) => {
    const classroom = sevenA()
    const result = classroom.update(
      { grade: 5 },
      { facts: {}, inCompetition: false, now: LATER },
    )

    assert.isTrue(result.isRight())
    assert.deepInclude(classroom.snapshot(), { grade: 5, category: 'F1', updatedAt: LATER })
  })

  test('turma sorteada não muda de categoria, mas muda de ano dentro dela', ({ assert }) => {
    const classroom = sevenA()
    const refused = classroom.update({ grade: 5 }, { facts: {}, inCompetition: true, now: LATER })
    const same = classroom.update({ grade: 8 }, { facts: {}, inCompetition: true, now: LATER })

    assert.deepEqual(refused.value, { code: 'CLASSROOM_CATEGORY_LOCKED' })
    assert.equal(classroom.snapshot().grade, 8)
    assert.isTrue(same.isRight())
  })

  test('left não muda nada', ({ assert }) => {
    const classroom = sevenA()
    classroom.update({ name: 'outra', grade: 5 }, { facts: {}, inCompetition: true, now: LATER })

    assert.deepInclude(classroom.snapshot(), { name: '7º A', grade: 7, updatedAt: null })
  })

  test('só apaga sem time numa chave', ({ assert }) => {
    assert.isTrue(sevenA().remove({ inCompetition: false }).isRight())
    assert.deepEqual(sevenA().remove({ inCompetition: true }).value, {
      code: 'CLASSROOM_IN_COMPETITION',
    })
  })

  test('renamesTo e changesCategoryWith dizem se vale conferir', ({ assert }) => {
    const classroom = sevenA()

    assert.isFalse(classroom.renamesTo(undefined))
    assert.isFalse(classroom.renamesTo('7º A'))
    assert.isTrue(classroom.renamesTo('7º B'))
    assert.isFalse(classroom.changesCategoryWith(undefined))
    assert.isFalse(classroom.changesCategoryWith(9))
    assert.isTrue(classroom.changesCategoryWith(4))
  })
})
