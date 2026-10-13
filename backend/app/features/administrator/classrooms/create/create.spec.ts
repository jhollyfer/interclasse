import { test } from '@japa/runner'

import { CATEGORY } from '#core/entity'
import { authenticateAsAdministrator, body, resetDatabase, signInWithFactory } from '#tests/helpers'

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
