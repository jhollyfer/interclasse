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
  test('nasce ativa, sem avatar e fora da lixeira', ({ assert }) => {
    assert.deepInclude(advisor().snapshot(), {
      status: 'ACTIVE',
      avatarId: null,
      deletedAt: null,
      createdAt: NOW,
    })
  })

  test('só conta viva e ativa entra', ({ assert }) => {
    const active = advisor()
    const inactive = advisor()
    inactive.update({ status: 'INACTIVE' }, NOW)
    const archived = advisor()
    archived.archive(NOW)

    assert.isTrue(active.canSignIn())
    assert.isFalse(inactive.canSignIn())
    assert.isFalse(archived.canSignIn())
  })

  test('arquivar carimba a lixeira e arquivar de novo é USER_ALREADY_ARCHIVED', ({ assert }) => {
    const user = advisor()

    assert.isTrue(user.archive(LATER).isRight())
    assert.equal(user.snapshot().deletedAt, LATER)
    assert.deepEqual(user.archive(LATER).value, { code: 'USER_ALREADY_ARCHIVED' })
  })

  test('restaurar limpa a lixeira e só vale para conta arquivada', ({ assert }) => {
    const user = advisor()

    assert.deepEqual(user.unarchive(LATER).value, { code: 'USER_NOT_ARCHIVED' })

    user.archive(NOW)
    assert.isTrue(user.unarchive(LATER).isRight())
    assert.isNull(user.snapshot().deletedAt)
  })

  test('apagar de vez exige a conta arquivada', ({ assert }) => {
    const user = advisor()

    assert.deepEqual(user.remove().value, { code: 'USER_NOT_ARCHIVED' })

    user.archive(NOW)
    assert.isTrue(user.remove().isRight())
  })

  test('trocar e-mail, senha, papel ou desativar derruba as sessões; nome não', ({ assert }) => {
    assert.isTrue(advisor().update({ email: 'outra@mail.com' }, LATER).revokesSessions)
    assert.isTrue(advisor().update({ password: 'Nova@1234' }, LATER).revokesSessions)
    assert.isTrue(advisor().update({ role: 'ADMINISTRATOR' }, LATER).revokesSessions)
    assert.isTrue(advisor().update({ status: 'INACTIVE' }, LATER).revokesSessions)
    assert.isFalse(advisor().update({ name: 'Ana Maria' }, LATER).revokesSessions)
    assert.isFalse(
      advisor().update({ email: 'ana@mail.com', role: 'ADVISOR' }, LATER).revokesSessions,
    )
  })

  test('mudar o papel avisa para soltar as turmas', ({ assert }) => {
    assert.isTrue(advisor().update({ role: 'REPRESENTATIVE' }, LATER).roleChanged)
    assert.isFalse(advisor().update({ role: 'ADVISOR' }, LATER).roleChanged)
  })

  test('campo ausente não mexe e avatarId null tira a foto', ({ assert }) => {
    const user = advisor()
    user.update({ avatarId: 'foto' }, NOW)

    user.update({ name: 'Ana Maria' }, LATER)
    assert.deepInclude(user.snapshot(), { name: 'Ana Maria', avatarId: 'foto', updatedAt: LATER })

    user.update({ avatarId: null }, LATER)
    assert.isNull(user.snapshot().avatarId)
  })

  test('a própria conta troca a senha só com a atual confirmada e outra diferente', ({
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

  test('a própria conta sem trocar a senha dispensa a prova', ({ assert }) => {
    const result = advisor().updateOwn(
      { name: 'Ana Maria' },
      { currentConfirmed: false, sameAsCurrent: false },
      LATER,
    )

    assert.isTrue(result.isRight())
  })

  test('reativa a conta arquivada com os dados novos e preserva id e criação', ({ assert }) => {
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

  test('o e-mail de conta viva é USER_ALREADY_EXISTS', ({ assert }) => {
    const result = advisor().revive({ name: 'Ana', password: 'Nova@1234', role: 'ADVISOR' }, LATER)

    assert.deepEqual(result.value, { code: 'USER_ALREADY_EXISTS' })
  })
})
