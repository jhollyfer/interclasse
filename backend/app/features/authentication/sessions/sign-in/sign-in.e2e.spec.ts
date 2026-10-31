import { test } from '@japa/runner'

import { COOKIE_TOKEN } from '#config/cookie'
import { ADMINISTRATOR, body, resetDatabase } from '#tests/http-fixtures'

/**
 * The whole session through the real path: sign-in is the only way to get a
 * valid cookie, and every other test in the suite depends on it.
 *
 * What is asserted here is the contract `backend-old` did not have: the token leaves in an
 * `httpOnly` cookie and not in the body, and the refusal does not tell whether the email
 * exists - otherwise the login form becomes a registration checker.
 */
test.group('authentication > sign-in', (group) => {
  group.each.setup(() => resetDatabase())

  test('correct credential responds 204 with both cookies', async ({ client, assert }) => {
    const response = await client.post('/authentication/sign-in').json(ADMINISTRATOR)

    response.assertStatus(204)

    // No body: the token pair travels only in `Set-Cookie`, and the page's JavaScript
    // never reaches it.
    assert.isEmpty(response.text())
    assert.isDefined(response.cookie(COOKIE_TOKEN.ACCESS)?.value)
    assert.isDefined(response.cookie(COOKIE_TOKEN.REFRESH)?.value)
  })

  test('wrong credential responds 401 without revealing whether the email exists', async ({
    client,
    assert,
  }) => {
    const existing = await client
      .post('/authentication/sign-in')
      .json({ email: ADMINISTRATOR.email, password: 'Errada1234!' })

    const nonexistent = await client
      .post('/authentication/sign-in')
      .json({ email: 'ninguem@mail.com', password: 'Errada1234!' })

    existing.assertStatus(401)
    nonexistent.assertStatus(401)

    // Same response in both cases: any difference - code, message or
    // pointed field - would turn the login into a registration checker.
    assert.deepEqual(body(existing), body(nonexistent))
    assert.equal(body(existing).code, 'INVALID_CREDENTIALS')

    // And no cookie is written on refusal.
    assert.isUndefined(existing.cookie(COOKIE_TOKEN.ACCESS))
  })

  test('429 on the sixth attempt from the same IP in a minute, even with the right password', async ({
    client,
    assert,
  }) => {
    const wrong = { email: ADMINISTRATOR.email, password: 'Errada123!' }

    for (let attempt = 1; attempt <= 5; attempt++) {
      const refused = await client.post('/authentication/sign-in').json(wrong)

      refused.assertStatus(401)
    }

    const blocked = await client
      .post('/authentication/sign-in')
      .json({ email: ADMINISTRATOR.email, password: ADMINISTRATOR.password })

    blocked.assertStatus(429)
    assert.equal(body(blocked).code, 'TOO_MANY_REQUESTS')
    assert.isUndefined(blocked.cookie(COOKIE_TOKEN.ACCESS))
  })
})
