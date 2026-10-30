import { test } from '@japa/runner'

import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

/**
 * `GET /documentation`: a referência navegável sobre `/openapi.json`. Mesma
 * proteção do documento que ela lê - para quem não opera, a rota não existe.
 */
test.group('reference > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('a página de referência é servida como HTML para quem opera', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client.get('/documentation').cookies(session)

    response.assertStatus(200)
    assert.include(response.header('content-type') ?? '', 'text/html')
    assert.include(response.text(), '/openapi.json')
  })

  test('sem sessão responde 404, e não 401 nem 403', async ({ client }) => {
    const response = await client.get('/documentation').redirects(0)

    response.assertStatus(404)
  })

  test('quem não opera a instalação também recebe 404', async ({ client, assert }) => {
    const session = await authenticateAsAdvisor(client)
    const response = await client.get('/documentation').cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'RESOURCE_NOT_FOUND')
  })
})
