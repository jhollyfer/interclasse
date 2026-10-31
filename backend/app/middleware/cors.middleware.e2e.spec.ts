import { test } from '@japa/runner'

import { body } from '#tests/http-fixtures'

/**
 * The allowlist of `config/cors.ts`, which comes from `CORS_ORIGINS`.
 *
 * The test runs outside development - `NODE_ENV=test` -, the only
 * condition in which the list applies: in dev the configuration allows any origin and
 * there would be nothing to measure. The chosen route is `/health-check`, because it is public and what
 * is asserted is the response header, not the body.
 */
test.group('cors > allowlist', () => {
  test('an origin in the allowlist receives the header', async ({ client, assert }) => {
    const response = await client.get('/health-check').header('origin', 'http://localhost:5173')

    response.assertStatus(200)
    assert.equal(response.header('access-control-allow-origin'), 'http://localhost:5173')
    // With credentials the browser only accepts a named origin, never `*`: without this
    // header the session cookie is not sent on the cross-origin request.
    assert.equal(response.header('access-control-allow-credentials'), 'true')
  })

  test('an origin outside the allowlist does not receive the header', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/health-check').header('origin', 'http://intruso.example')

    // The request itself goes through - CORS is the browser's decision, and the server
    // merely stops authorizing. Without the header, the browser discards the
    // response.
    response.assertStatus(200)
    assert.isUndefined(response.header('access-control-allow-origin'))
  })
})

/**
 * The CSRF barrier: every write checks the origin, whatever the `Content-Type`.
 * The case without `Origin` and without `Sec-Fetch-Site` belongs to `origin.middleware.unit.spec.ts`:
 * the test client always sends the allowlist origin (`tests/bootstrap.ts`).
 *
 * `config/shield.ts` has `csrf.enabled: false`, and the bodyparser accepts
 * `multipart/form-data` and `application/x-www-form-urlencoded` — **simple**
 * content types, which a `<form>` from another origin sends with no preflight. In
 * production the cookie travels along, which is exactly the condition for CSRF.
 *
 * `origin_middleware` is what closes that, and this group is what keeps the barrier
 * from vanishing unnoticed: it has no visible effect on a legitimate
 * request, so nothing else would fail on its removal.
 */
test.group('cors > cross-origin writes', () => {
  test('an origin outside the allowlist is refused with 403', async ({ client, assert }) => {
    const response = await client
      .post('/authentication/sign-in')
      .header('origin', 'http://intruso.example')
      .header('content-type', 'application/x-www-form-urlencoded')
      .field('email', 'quem@exemplo.com')
      .field('password', 'nao-importa')

    response.assertStatus(403)
    assert.equal(body(response).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('an origin in the allowlist passes the barrier', async ({ client, assert }) => {
    const response = await client
      .post('/authentication/sign-in')
      .header('origin', 'http://localhost:5173')
      .header('content-type', 'application/x-www-form-urlencoded')
      .field('email', 'quem@exemplo.com')
      .field('password', 'nao-importa')

    // It passes the barrier and reaches the validator or the credentials: what matters
    // is that it is **not** the origin 403.
    assert.notEqual(body(response).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('JSON from an origin outside the allowlist is also refused', async ({ client, assert }) => {
    // The barrier does not look at `Content-Type`: `text/plain` and an empty POST also cross
    // sites without preflight (_standards/backend.md §4.10).
    const response = await client
      .post('/authentication/sign-in')
      .header('origin', 'http://intruso.example')
      .json({ email: 'quem@exemplo.com', password: 'nao-importa' })

    response.assertStatus(403)
    assert.equal(body(response).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('text/plain from an origin outside the allowlist is refused', async ({ client, assert }) => {
    const response = await client
      .post('/authentication/sign-out')
      .header('origin', 'http://intruso.example')
      .header('content-type', 'text/plain')

    response.assertStatus(403)
    assert.equal(body(response).code, 'ORIGIN_NOT_ALLOWED')
  })
})
