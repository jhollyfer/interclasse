import { test } from '@japa/runner'

import { CATEGORY } from '#core/entity'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { UserFactory } from '#database/factories/user.factory'
import { authenticateAsAdministrator, body, resetDatabase, signInWithFactory } from '#tests/helpers'

test.group('classrooms > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('devolve o envelope paginado, ordenado por nome, com as pessoas aninhadas', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const advisor = await UserFactory.create()
    await ClassroomFactory.merge({ name: '8º B', grade: 8, category: CATEGORY.F2 }).create()
    await ClassroomFactory.merge({
      name: '6º A',
      grade: 6,
      category: CATEGORY.F2,
      advisorId: advisor.id,
    }).create()

    const response = await client.get('/administrator/classrooms').cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).meta.total, 2)
    assert.deepEqual(
      body(response).data.map((classroom: { name: string }) => classroom.name),
      ['6º A', '8º B'],
    )
    assert.equal(body(response).data[0].advisor.id, advisor.id)
    assert.isNull(body(response).data[1].advisor)
  })

  test('`?category` e `?search` recortam a lista', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    await ClassroomFactory.merge({ name: '4º A', grade: 4, category: CATEGORY.F1 }).create()
    await ClassroomFactory.merge({ name: '7º A', grade: 7, category: CATEGORY.F2 }).create()
    await ClassroomFactory.merge({ name: '9º C', grade: 9, category: CATEGORY.F2 }).create()

    const porCategoria = await client
      .get('/administrator/classrooms')
      .qs({ category: CATEGORY.F1 })
      .cookies(session)
    const porNome = await client
      .get('/administrator/classrooms')
      .qs({ search: '9º' })
      .cookies(session)

    porCategoria.assertStatus(200)
    assert.deepEqual(
      body(porCategoria).data.map((classroom: { name: string }) => classroom.name),
      ['4º A'],
    )
    porNome.assertStatus(200)
    assert.deepEqual(
      body(porNome).data.map((classroom: { name: string }) => classroom.name),
      ['9º C'],
    )
  })

  test('`?sort` e `?direction` trocam a ordem', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    await ClassroomFactory.merge({ name: 'A', grade: 9, category: CATEGORY.F2 }).create()
    await ClassroomFactory.merge({ name: 'B', grade: 3, category: CATEGORY.F1 }).create()

    const response = await client
      .get('/administrator/classrooms')
      .qs({ sort: 'grade', direction: 'desc' })
      .cookies(session)

    response.assertStatus(200)
    assert.deepEqual(
      body(response).data.map((classroom: { grade: number }) => classroom.grade),
      [9, 3],
    )
  })

  test('categoria ou coluna de ordenação fora da lista responde 422', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const categoria = await client
      .get('/administrator/classrooms')
      .qs({ category: 'F9' })
      .cookies(session)
    const ordenacao = await client
      .get('/administrator/classrooms')
      .qs({ sort: 'password' })
      .cookies(session)

    categoria.assertStatus(422)
    assert.property(body(categoria).errors, 'category')
    ordenacao.assertStatus(422)
    assert.property(body(ordenacao).errors, 'sort')
  })

  test('sem sessão responde 401, representante responde 403', async ({ client, assert }) => {
    const anonymous = await client.get('/administrator/classrooms')
    anonymous.assertStatus(401)

    const { session } = await signInWithFactory(client, 'representative')
    const response = await client.get('/administrator/classrooms').cookies(session)

    response.assertStatus(403)
    assert.equal(body(response).code, 'ACCESS_DENIED')
  })
})
