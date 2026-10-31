import { test } from '@japa/runner'

import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

/**
 * `GET /documentation`: the browsable reference over `/openapi.json`. Same
 * protection as the document it reads - for whoever does not operate, the route does not exist.
 */
test.group('reference > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('the reference page is served as HTML to the operator', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client.get('/documentation').cookies(session)

    response.assertStatus(200)
    assert.include(response.header('content-type') ?? '', 'text/html')
    assert.include(response.text(), '/openapi.json')
  })

  test('without a session responds 404, not 401 nor 403', async ({ client }) => {
    const response = await client.get('/documentation').redirects(0)

    response.assertStatus(404)
  })

  test('whoever does not operate the installation also gets 404', async ({ client, assert }) => {
    const session = await authenticateAsAdvisor(client)
    const response = await client.get('/documentation').cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'RESOURCE_NOT_FOUND')
  })
})
