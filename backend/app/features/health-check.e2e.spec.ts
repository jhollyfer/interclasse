import { test } from '@japa/runner'

/** `GET /health-check`: the container liveness probe. No session, no database. */
test.group('health-check', () => {
  test('the probe answers ok and reveals nothing about the infrastructure', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/health-check')

    response.assertStatus(200)

    // Deep equality, not `assertBodyContains`: what is asserted is that the
    // body is **only** this. Disk usage, memory or connection counts on a
    // public probe would be free infrastructure information for anyone who asks.
    assert.deepEqual(response.body(), { status: 'ok' })
    assert.equal(response.header('cache-control'), 'no-store')
  })

  test('the probe does not require a session', async ({ client }) => {
    const response = await client.get('/health-check').redirects(0)

    response.assertStatus(200)
  })
})
