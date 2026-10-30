import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { ACTIVE_STATUS, USER_ROLE } from '@interclasse/shared'

import User from '#models/user'
import { UserFactory } from '#database/factories/user.factory'
import {
  ADMINISTRATOR,
  authenticateAsAdministrator,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

/** Um arquivo já confirmado, que é o único estado que `assertExist` aceita. */

/**
 * O payload de criação. `passwordConfirmation` acompanha a senha porque a regra
 * de força compartilhada exige `confirmed` - o campo é lido do input cru e não
 * chega ao banco.
 */
const payload = {
  name: 'Nova Pessoa',
  email: 'nova.pessoa@mail.com',
  password: 'Demo1234!',
  passwordConfirmation: 'Demo1234!',
  role: USER_ROLE.ADVISOR,
}

test.group('administrador > users > criação', (group) => {
  group.each.setup(() => resetDatabase())

  test('a conta nasce ACTIVE e sem senha na resposta', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.post('/administrator/users').cookies(session).json(payload)

    response.assertStatus(201)
    assert.equal(body(response).role, USER_ROLE.ADVISOR)
    // A coluna tem `DEFAULT 'ACTIVE'` e o payload não escreve a chave ausente.
    assert.equal(body(response).status, ACTIVE_STATUS.ACTIVE)
    assert.notProperty(body(response), 'password')
  })

  test('a senha é gravada cifrada e serve para entrar', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const criado = await client.post('/administrator/users').cookies(session).json(payload)
    criado.assertStatus(201)

    // O mixin `withAuthFinder` cifra no save: gravar o texto puro deixaria a
    // senha legível no banco, e um hash de hash não deixaria ninguém entrar.
    const user = await User.findOrFail(body(criado).id)
    assert.notEqual(user.password, payload.password)

    const entrada = await client
      .post('/authentication/sign-in')
      .json({ email: payload.email, password: payload.password })

    entrada.assertStatus(204)
  })

  test('e-mail de conta viva responde 409 apontando o campo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/users')
      .cookies(session)
      .json({ ...payload, email: ADMINISTRATOR.email })

    response.assertStatus(409)
    assert.equal(body(response).code, 'USER_ALREADY_EXISTS')
    assert.property(body(response).errors, 'email')
  })

  test('e-mail de conta arquivada reativa a linha em vez de estourar o unique', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const arquivado = await UserFactory.merge({
      email: payload.email,
      deletedAt: DateTime.now(),
    }).create()

    const response = await client.post('/administrator/users').cookies(session).json(payload)

    response.assertStatus(201)
    // Mesma linha: `email` é `UNIQUE` global e a remoção é lógica, então
    // inserir de novo esbarraria no índice e viraria 500.
    assert.equal(body(response).id, arquivado.id)
    assert.isNull(body(response).deletedAt)

    const [{ count }] = await db.from('users').where('email', payload.email).count('* as count')
    assert.equal(Number(count), 1)
  })

  test('senha fraca responde 422 apontando o campo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/users')
      .cookies(session)
      .json({ ...payload, password: 'demo', passwordConfirmation: 'demo' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'password')
  })

  test('role ausente responde 422: o papel é sempre explícito', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const { role: _semPapel, ...semRole } = payload

    const response = await client.post('/administrator/users').cookies(session).json(semRole)

    response.assertStatus(422)
    // `backend-old` caía em ADMINISTRATOR por omissão, e um caminho de criação
    // esquecido gravava o papel mais poderoso em silêncio.
    assert.property(body(response).errors, 'role')
  })

  test('foto inexistente responde 422 apontando o campo e antes de gravar', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/users')
      .cookies(session)
      .json({ ...payload, avatarId: randomUUID() })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
    assert.property(body(response).errors, 'avatarId')

    const [{ count }] = await db.from('users').where('email', payload.email).count('* as count')
    assert.equal(Number(count), 0)
  })
})
