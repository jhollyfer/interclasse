import { test } from '@japa/runner'

import { User } from './user.entity.ts'

const NOW = new Date('2026-10-29T12:00:00Z')
const LATER = new Date('2026-10-30T12:00:00Z')
const PROVED = { currentConfirmed: true, sameAsCurrent: false }

function advisor(): User {
  return User.create({
    id: 'id',
    name: 'Ana',
    email: 'ana@mail.com',
    password: 'Senha@123',
    role: 'ADVISOR',
    now: NOW,
  })
}

test.group('User', () => {
  test('is born active, without avatar and outside the trash', ({ assert }) => {
    assert.deepInclude(advisor().snapshot(), {
      status: 'ACTIVE',
      avatarId: null,
      deletedAt: null,
      createdAt: NOW,
    })
  })

  test('only a live and active account gets in', ({ assert }) => {
    const active = advisor()
    const inactive = advisor()
    inactive.update({ status: 'INACTIVE' }, NOW)
    const archived = advisor()
    archived.archive(NOW)

    assert.isTrue(active.canSignIn())
    assert.isFalse(inactive.canSignIn())
    assert.isFalse(archived.canSignIn())
  })

  test('archiving stamps the trash and archiving again is USER_ALREADY_ARCHIVED', ({ assert }) => {
    const user = advisor()

    assert.isTrue(user.archive(LATER).isRight())
    assert.equal(user.snapshot().deletedAt, LATER)
    assert.deepEqual(user.archive(LATER).value, { code: 'USER_ALREADY_ARCHIVED' })
  })

  test('restoring clears the trash and only holds for an archived account', ({ assert }) => {
    const user = advisor()

    assert.deepEqual(user.unarchive(LATER).value, { code: 'USER_NOT_ARCHIVED' })

    user.archive(NOW)
    assert.isTrue(user.unarchive(LATER).isRight())
    assert.isNull(user.snapshot().deletedAt)
  })

  test('deleting for good requires the archived account', ({ assert }) => {
    const user = advisor()

    assert.deepEqual(user.remove().value, { code: 'USER_NOT_ARCHIVED' })

    user.archive(NOW)
    assert.isTrue(user.remove().isRight())
  })

  test('changing e-mail, password, role or deactivating drops the sessions; name does not', ({
    assert,
  }) => {
    assert.isTrue(advisor().update({ email: 'outra@mail.com' }, LATER).revokesSessions)
    assert.isTrue(advisor().update({ password: 'Nova@1234' }, LATER).revokesSessions)
    assert.isTrue(advisor().update({ role: 'ADMINISTRATOR' }, LATER).revokesSessions)
    assert.isTrue(advisor().update({ status: 'INACTIVE' }, LATER).revokesSessions)
    assert.isFalse(advisor().update({ name: 'Ana Maria' }, LATER).revokesSessions)
    assert.isFalse(
      advisor().update({ email: 'ana@mail.com', role: 'ADVISOR' }, LATER).revokesSessions,
    )
  })

  test('changing the role warns to release the classrooms', ({ assert }) => {
    assert.isTrue(advisor().update({ role: 'REPRESENTATIVE' }, LATER).roleChanged)
    assert.isFalse(advisor().update({ role: 'ADVISOR' }, LATER).roleChanged)
  })

  test('an absent field leaves alone and avatarId null removes the photo', ({ assert }) => {
    const user = advisor()
    user.update({ avatarId: 'foto' }, NOW)

    user.update({ name: 'Ana Maria' }, LATER)
    assert.deepInclude(user.snapshot(), { name: 'Ana Maria', avatarId: 'foto', updatedAt: LATER })

    user.update({ avatarId: null }, LATER)
    assert.isNull(user.snapshot().avatarId)
  })

  test('the account itself changes the password only with the current one confirmed and a different one', ({
    assert,
  }) => {
    const wrong = advisor().updateOwn(
      { password: 'Nova@1234' },
      { currentConfirmed: false, sameAsCurrent: false },
      LATER,
    )
    const same = advisor().updateOwn(
      { password: 'Senha@123' },
      { currentConfirmed: true, sameAsCurrent: true },
      LATER,
    )
    const ok = advisor().updateOwn({ password: 'Nova@1234' }, PROVED, LATER)

    assert.deepEqual(wrong.value, { code: 'CURRENT_PASSWORD_INVALID' })
    assert.deepEqual(same.value, { code: 'PASSWORD_SAME_AS_CURRENT' })
    assert.isTrue(ok.isRight())
    assert.deepEqual(ok.value, { revokesSessions: true, roleChanged: false })
  })

  test('the account itself without changing the password skips the proof', ({ assert }) => {
    const result = advisor().updateOwn(
      { name: 'Ana Maria' },
      { currentConfirmed: false, sameAsCurrent: false },
      LATER,
    )

    assert.isTrue(result.isRight())
  })

  test('reactivates the archived account with the new data and preserves id and creation', ({
    assert,
  }) => {
    const user = advisor()
    user.archive(NOW)

    const result = user.revive(
      { name: 'Ana Nova', password: 'Nova@1234', role: 'ADMINISTRATOR' },
      LATER,
    )

    assert.isTrue(result.isRight())
    assert.deepInclude(user.snapshot(), {
      id: 'id',
      name: 'Ana Nova',
      role: 'ADMINISTRATOR',
      deletedAt: null,
      createdAt: NOW,
    })
  })

  test('the e-mail of a live account is USER_ALREADY_EXISTS', ({ assert }) => {
    const result = advisor().revive({ name: 'Ana', password: 'Nova@1234', role: 'ADVISOR' }, LATER)

    assert.deepEqual(result.value, { code: 'USER_ALREADY_EXISTS' })
  })
})
