import { test } from '@japa/runner'
import { USER_ROLE } from '@interclasse/shared'

import { EnrollmentRemoval } from './enrollment-removal.entity.ts'

const NOW = new Date('2026-10-29T12:00:00Z')
const LATER = new Date('2026-10-30T12:00:00Z')

function recordedBy(actorRole: 'ADMINISTRATOR' | 'ADVISOR'): EnrollmentRemoval {
  return EnrollmentRemoval.record({
    id: 'id',
    classroomId: 'classroom',
    sportId: 'sport',
    studentId: 'student',
    studentName: 'Ana',
    reason: 'Mudou de turno',
    actorId: 'actor',
    actorRole,
    now: NOW,
  })
}

test.group('EnrollmentRemoval', () => {
  test('a remoção do conselheiro nasce pendente', ({ assert }) => {
    const removal = recordedBy(USER_ROLE.ADVISOR)

    assert.deepInclude(removal.snapshot(), {
      studentName: 'Ana',
      reason: 'Mudou de turno',
      acknowledgedAt: null,
    })
  })

  test('a remoção do administrador já nasce lida', ({ assert }) => {
    assert.equal(recordedBy(USER_ROLE.ADMINISTRATOR).snapshot().acknowledgedAt, NOW)
  })

  test('dar ciência carimba a data', ({ assert }) => {
    const removal = recordedBy(USER_ROLE.ADVISOR)

    const result = removal.acknowledge(LATER)

    assert.isTrue(result.isRight())
    assert.deepInclude(removal.snapshot(), { acknowledgedAt: LATER, updatedAt: LATER })
  })

  test('repetir a ciência mantém a data da primeira', ({ assert }) => {
    const removal = recordedBy(USER_ROLE.ADVISOR)
    removal.acknowledge(LATER)

    const again = removal.acknowledge(new Date('2026-11-01T00:00:00Z'))

    assert.deepEqual(again.value, { code: 'ENROLLMENT_REMOVAL_ALREADY_ACKNOWLEDGED' })
    assert.equal(removal.snapshot().acknowledgedAt, LATER)
  })
})
