import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  ADMINISTRATOR,
  authenticateAsAdministrator,
  body,
  resetDatabase,
} from '#tests/http-fixtures'
import { Stored } from '#tests/stored-fixtures'

/**
 * Reading the own account, and what happens to someone archived while
 * still holding a token.
 *
 * The guard checks the token signature and validity, and nothing else: it does not know that
 * the `users` row was archived. Without the `notDeleted` scope in the use case,
 * archiving a user would have no effect until the token expired - up to a day
 * later, by the access cookie validity.
 */
test.group('account > read', (group) => {
  group.each.setup(() => resetDatabase())

  test('valid session responds 200 with the own user', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/account').cookies(session)

    response.assertStatus(200)
    assert.equal(body(response).email, ADMINISTRATOR.email)
    assert.equal(body(response).role, 'ADMINISTRATOR')
    // The password never leaves in the response: the column is `serializeAs: null`.
    assert.notProperty(body(response), 'password')
  })

  test('archived user with a still valid token responds 401', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const user = await Stored.userByEmailOrFail(ADMINISTRATOR.email)

    await user.merge({ deletedAt: DateTime.now() }).save()

    const response = await client.get('/account').cookies(session)

    // 401 and not 404: the guard rereads `deletedAt` and `status` on every request,
    // so archiving the account ends the session instead of leaving it authenticated
    // until the token expires. The previous 404 said "you are authenticated, but your
    // own account does not exist", which described the hole instead of the rule.
    response.assertStatus(401)
  })
})

/**
 * `middleware.auth()` is on the `/account` group, not on each route. This
 * test proves it is actually wired: without it, `context.auth.user!`
 * would be `undefined` and the read would respond 500 - or worse, the `id` would come from
 * somewhere else.
 */
test.group('account > without a session', () => {
  test('request without a cookie responds 401', async ({ client }) => {
    const read = await client.get('/account')
    const write = await client.put('/account').json({ name: 'Qualquer' })

    read.assertStatus(401)
    write.assertStatus(401)
  })
})
