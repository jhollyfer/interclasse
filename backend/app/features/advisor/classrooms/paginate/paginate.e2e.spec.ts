import { test } from '@japa/runner'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { UserFactory } from '#database/factories/user.factory'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

test.group('classrooms > paginate (conselheiro)', (group) => {
  group.each.setup(() => resetDatabase())

  test('o conselheiro vê só a turma que aconselha', async ({ client, assert }) => {
    const { user, session } = await signInWithFactory(client)
    await ClassroomFactory.merge({ name: '9º B', advisorId: user.id }).create()
    await ClassroomFactory.merge({ name: '7º A' }).create()
    await ClassroomFactory.merge({ name: '8º C' }).create()

    const response = await client.get('/advisor/classrooms').cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).meta.total, 1)
    assert.deepEqual(
      body(response).data.map((classroom: { name: string }) => classroom.name),
      ['9º B'],
    )
  })

  test('conselheiro sem turma recebe lista vazia, mesmo havendo turmas de outro', async ({
    client,
    assert,
  }) => {
    const { session } = await signInWithFactory(client)
    const other = await UserFactory.create()
    await ClassroomFactory.merge({ advisorId: other.id }).create()

    const response = await client.get('/advisor/classrooms').cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 0)
    assert.equal(body(response).meta.total, 0)
  })

  test('o administrador vê todas', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const { user } = await signInWithFactory(client)
    await ClassroomFactory.merge({ advisorId: user.id }).create()
    await ClassroomFactory.create()

    const response = await client.get('/advisor/classrooms').cookies(session)

    response.assertStatus(200)
    assert.lengthOf(body(response).data, 2)
  })

  test('`?search` filtra pelo nome dentro do escopo', async ({ client, assert }) => {
    const { user, session } = await signInWithFactory(client)
    await ClassroomFactory.merge({ name: '6º B', advisorId: user.id }).create()
    // Casa a busca, mas é de outro conselheiro: o escopo vale antes do filtro.
    await ClassroomFactory.merge({ name: '7º B' }).create()

    const casa = await client.get('/advisor/classrooms').qs({ search: 'B' }).cookies(session)
    const nada = await client.get('/advisor/classrooms').qs({ search: 'A' }).cookies(session)

    casa.assertStatus(200)
    assert.deepEqual(
      body(casa).data.map((classroom: { name: string }) => classroom.name),
      ['6º B'],
    )
    assert.lengthOf(body(nada).data, 0)
  })

  test('sem sessão responde 401, representante responde 403', async ({ client, assert }) => {
    const anonymous = await client.get('/advisor/classrooms')
    anonymous.assertStatus(401)

    const { session } = await signInWithFactory(client, 'representative')
    const response = await client.get('/advisor/classrooms').cookies(session)

    response.assertStatus(403)
    assert.equal(body(response).code, 'ACCESS_DENIED')
  })
})
