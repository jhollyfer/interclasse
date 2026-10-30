import { test } from '@japa/runner'
import { CATEGORY } from '@interclasse/shared'

import { Stored } from '#tests/stored-fixtures'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
  authenticateAsAdvisor,
} from '#tests/http-fixtures'

/**
 * O caminho dos jogos de ponta a ponta, por HTTP: turmas, alunos, inscrições,
 * sorteio, placar, mata-mata e o site.
 *
 * Um arquivo só porque as etapas dependem umas das outras - o sorteio precisa
 * de inscrição, o mata-mata precisa de placar -, e espalhá-las repetiria toda a
 * montagem em cada spec.
 */

/** Cria `total` turmas do 6º ao 9º, cada uma com um aluno inscrito na modalidade. */

test.group('jogos > turmas', (group) => {
  group.each.setup(() => resetDatabase())

  test('a categoria sai do ano, e nome repetido é 409', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const quinto = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '5º A', grade: 5 })
    const sexto = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '6º A', grade: 6 })
    const repetido = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '6º A', grade: 6 })

    assert.equal(body(quinto).category, CATEGORY.F1)
    assert.equal(body(sexto).category, CATEGORY.F2)
    repetido.assertStatus(409)
    assert.equal(body(repetido).code, 'CLASSROOM_ALREADY_EXISTS')
  })

  test('conselheiro precisa ter o papel de conselheiro', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { user } = await signInWithFactory(client, 'representative')

    const response = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '7º A', grade: 7, advisorId: user.id })

    response.assertStatus(422)
    assert.equal(body(response).code, 'ADVISOR_NOT_FOUND')
  })
})

test.group('administrator/classrooms/create > acesso e validação', (group) => {
  group.each.setup(() => resetDatabase())

  test('401: sem sessão', async ({ client }) => {
    const response = await client.post('/administrator/classrooms')

    response.assertStatus(401)
  })

  test('403: conselheiro não alcança a rota da organização', async ({ client }) => {
    const advisor = await authenticateAsAdvisor(client)

    const response = await client.post('/administrator/classrooms').cookies(advisor)

    response.assertStatus(403)
  })
})

test.group('administrator/classrooms/create > 422', (group) => {
  group.each.setup(() => resetDatabase())

  test('nome vazio e ano fora do 3º ao 9º respondem 422 apontando os campos, e nada é gravado', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)

    const response = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '   ', grade: 1 })

    response.assertStatus(422)
    assert.property(body(response).errors, 'name')
    assert.property(body(response).errors, 'grade')
    assert.lengthOf(await Stored.classrooms(), 0)
  })
})
