import { test } from '@japa/runner'

import { authenticateAsAdministrator, resetDatabase } from '#tests/http-fixtures'

/**
 * Signing out must hold on the server, not just on screen.
 *
 * `backend-old` had no sign-out: the token was a JWT in the body, kept by the
 * client, and "signing out" was the browser forgetting it - the token stayed valid until
 * it expired. Here the token is a row in `auth_access_tokens`, and deleting it is what
 * makes the session unrecoverable.
 */
test.group('authentication > sign-out', (group) => {
  group.each.setup(() => resetDatabase())

  test('sign-out invalidates the running session', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)

    const signOut = await client.post('/authentication/sign-out').cookies(session)

    signOut.assertStatus(204)

    // The same access cookie, now without the row that backed it.
    const duplicate = await client.post('/authentication/sign-out').cookies(session)

    duplicate.assertStatus(401)
  })
})
