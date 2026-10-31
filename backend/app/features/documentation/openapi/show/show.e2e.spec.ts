import { test } from '@japa/runner'

import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

/**
 * `GET /openapi.json`. Requires the session of whoever operates the installation, but must not
 * say so: 401 and 403 would confirm that the route exists and that a role reaches
 * it. For whoever cannot see it, it is simply not there - 404.
 */
test.group('openapi > show', (group) => {
  group.each.setup(() => resetDatabase())

  test('the document is served as JSON to the operator', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client.get('/openapi.json').cookies(session)

    response.assertStatus(200)
    assert.include(response.header('content-type') ?? '', 'application/json')
    assert.equal(body(response).openapi, '3.1.0')
  })

  test('no service route appears in the document', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client.get('/openapi.json').cookies(session)

    response.assertStatus(200)

    for (const path of ['/health-check', '/openapi.json', '/documentation']) {
      assert.notProperty(
        body(response).paths,
        path,
        `${path} is documented, and it is not an API operation`,
      )
    }
  })

  test('without a session responds 404, not 401 nor 403', async ({ client }) => {
    const response = await client.get('/openapi.json').redirects(0)

    response.assertStatus(404)
  })

  test('whoever does not operate the installation also gets 404', async ({ client, assert }) => {
    const session = await authenticateAsAdvisor(client)
    const response = await client.get('/openapi.json').cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'RESOURCE_NOT_FOUND')
  })
})
