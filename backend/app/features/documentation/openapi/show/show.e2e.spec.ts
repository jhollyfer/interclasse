import { test } from '@japa/runner'

import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

/**
 * `GET /openapi.json`. Exige sessão de quem opera a instalação, mas não pode
 * dizer isso: 401 e 403 confirmariam que a rota existe e que há um papel que a
 * alcança. Para quem não pode ver, ela simplesmente não está lá - 404.
 */
test.group('openapi > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('o documento é servido como JSON para quem opera', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client.get('/openapi.json').cookies(session)

    response.assertStatus(200)
    assert.include(response.header('content-type') ?? '', 'application/json')
    assert.equal(body(response).openapi, '3.1.0')
  })

  test('nenhuma rota de serviço aparece no documento', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client.get('/openapi.json').cookies(session)

    response.assertStatus(200)

    for (const caminho of ['/health-check', '/openapi.json', '/documentation']) {
      assert.notProperty(
        body(response).paths,
        caminho,
        `${caminho} está documentado, e não é operação de API`,
      )
    }
  })

  test('sem sessão responde 404, e não 401 nem 403', async ({ client }) => {
    const response = await client.get('/openapi.json').redirects(0)

    response.assertStatus(404)
  })

  test('quem não opera a instalação também recebe 404', async ({ client, assert }) => {
    const session = await authenticateAsAdvisor(client)
    const response = await client.get('/openapi.json').cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'RESOURCE_NOT_FOUND')
  })
})
