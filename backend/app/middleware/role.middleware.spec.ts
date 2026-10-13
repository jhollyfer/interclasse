import { test } from '@japa/runner'

import { UserRoles } from '#core/entity'
import { UserFactory } from '#database/factories/user.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/helpers'

/**
 * A matriz de papéis inteira, uma célula por caso.
 *
 * Existe separada dos specs de recurso porque a regra que ela afirma **não** é
 * de recurso nenhum: é o desenho de `start/routes.ts`, e quebra quando alguém
 * move uma rota de grupo.
 *
 * A distinção que ela protege acima de tudo é `401` contra `403`: sem sessão o
 * papel do requisitante é desconhecido, e responder "você não pode" no lugar de
 * "não sei quem é você" contaria a quem nem entrou que o recurso existe.
 */

/** Uma rota de leitura de cada recurso do painel administrativo. */
const PAINEL = ['classrooms', 'sports', 'announcements', 'brackets', 'matches', 'users']

const USUARIO = {
  name: 'Pessoa da matriz',
  email: 'matriz@mail.com',
  password: 'Demo1234!',
  passwordConfirmation: 'Demo1234!',
  role: UserRoles.ADVISOR,
}

test.group('papéis > sem sessão', (group) => {
  group.each.setup(() => resetDatabase())

  test('a conta responde 401, e não 403', async ({ client }) => {
    const response = await client.get('/account')

    response.assertStatus(401)
  })

  for (const recurso of PAINEL) {
    test(`/administrator/${recurso} responde 401, e não 403`, async ({ client }) => {
      const response = await client.get(`/administrator/${recurso}`)

      response.assertStatus(401)
    })
  }

  test('a área do conselheiro e a do representante respondem 401', async ({ client }) => {
    const conselheiro = await client.get('/advisor/classrooms')
    const representante = await client.get('/representative/enrollments')

    conselheiro.assertStatus(401)
    representante.assertStatus(401)
  })

  test('o site responde sem sessão', async ({ client }) => {
    for (const caminho of ['sports', 'announcements', 'matches', 'brackets']) {
      const response = await client.get(`/storefront/${caminho}`)

      response.assertStatus(200)
    }
  })
})

test.group('papéis > o conselheiro não alcança o painel', (group) => {
  group.each.setup(() => resetDatabase())

  for (const recurso of PAINEL) {
    test(`/administrator/${recurso} responde 403 ao conselheiro`, async ({ client, assert }) => {
      const session = await authenticateAsAdvisor(client)

      const response = await client.get(`/administrator/${recurso}`).cookies(session)

      response.assertStatus(403)
      assert.equal(body(response).code, 'ACCESS_DENIED')
    })
  }

  test('nem cria conta', async ({ client }) => {
    const session = await authenticateAsAdvisor(client)

    const response = await client.post('/administrator/users').cookies(session).json(USUARIO)

    response.assertStatus(403)
  })

  test('e não entra na área do representante', async ({ client }) => {
    const session = await authenticateAsAdvisor(client)

    const response = await client.get('/representative/enrollments').cookies(session)

    response.assertStatus(403)
  })
})

test.group('papéis > o representante só alcança as próprias inscrições', (group) => {
  group.each.setup(() => resetDatabase())

  test('painel e área do conselheiro respondem 403', async ({ client }) => {
    const { session } = await signInWithFactory(client, 'representative')

    const painel = await client.get('/administrator/classrooms').cookies(session)
    const conselheiro = await client.get('/advisor/students').cookies(session)

    painel.assertStatus(403)
    conselheiro.assertStatus(403)
  })

  test('sem turma vinculada, as inscrições respondem 404', async ({ client, assert }) => {
    const { session } = await signInWithFactory(client, 'representative')

    const response = await client.get('/representative/enrollments').cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })
})

test.group('papéis > o administrador passa em tudo', (group) => {
  group.each.setup(() => resetDatabase())

  for (const recurso of PAINEL) {
    test(`/administrator/${recurso} responde 200 ao administrador`, async ({ client }) => {
      const session = await authenticateAsAdministrator(client)

      const response = await client.get(`/administrator/${recurso}`).cookies(session)

      response.assertStatus(200)
    })
  }

  test('e cobre a falta do conselheiro na área dele', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/advisor/classrooms').cookies(session)

    response.assertStatus(200)
  })

  test('o administrador percorre usuários do início ao fim', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)

    const criado = await client.post('/administrator/users').cookies(session).json(USUARIO)
    criado.assertStatus(201)

    const id = body(criado).id

    const arquivado = await client.patch(`/administrator/users/${id}/archive`).cookies(session)
    arquivado.assertStatus(204)

    const apagado = await client.delete(`/administrator/users/${id}`).cookies(session)
    apagado.assertStatus(204)
  })

  test('e arquiva outro administrador, que não é a própria conta', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const outro = await UserFactory.apply('administrator').create()

    const response = await client.patch(`/administrator/users/${outro.id}/archive`).cookies(session)

    response.assertStatus(204)
  })
})
