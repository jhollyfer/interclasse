import { test } from '@japa/runner'
import { USER_ROLE } from '@interclasse/shared'

import { UserFactory } from '#database/factories/user.factory'
import {
  authenticateAsAdministrator,
  authenticateAsAdvisor,
  body,
  resetDatabase,
  signInWithFactory,
} from '#tests/http-fixtures'

/**
 * The whole role matrix, one cell per case.
 *
 * It lives apart from the resource specs because the rule it asserts is **not**
 * any resource's: it is the design of `start/routes.ts`, and it breaks when someone
 * moves a route between groups.
 *
 * The distinction it protects above all is `401` versus `403`: without a session the
 * requester's role is unknown, and answering "you cannot" instead of
 * "I don't know who you are" would tell someone who has not even signed in that the resource exists.
 */

/** One read route of each administrative panel resource. */
const PANEL = ['classrooms', 'sports', 'announcements', 'brackets', 'matches', 'users']

const NEW_USER = {
  name: 'Pessoa da matriz',
  email: 'matriz@mail.com',
  password: 'Demo1234!',
  passwordConfirmation: 'Demo1234!',
  role: USER_ROLE.ADVISOR,
}

test.group('roles > without a session', (group) => {
  group.each.setup(() => resetDatabase())

  test('the account answers 401, and not 403', async ({ client }) => {
    const response = await client.get('/account')

    response.assertStatus(401)
  })

  for (const resource of PANEL) {
    test(`/administrator/${resource} answers 401, and not 403`, async ({ client }) => {
      const response = await client.get(`/administrator/${resource}`)

      response.assertStatus(401)
    })
  }

  test('the advisor area and the representative area answer 401', async ({ client }) => {
    const advisor = await client.get('/advisor/classrooms')
    const representative = await client.get('/representative/enrollments')

    advisor.assertStatus(401)
    representative.assertStatus(401)
  })

  test('the site answers without a session', async ({ client }) => {
    for (const path of ['sports', 'announcements', 'matches', 'brackets']) {
      const response = await client.get(`/storefront/${path}`)

      response.assertStatus(200)
    }
  })
})

test.group('roles > the advisor does not reach the panel', (group) => {
  group.each.setup(() => resetDatabase())

  for (const resource of PANEL) {
    test(`/administrator/${resource} answers 403 to the advisor`, async ({ client, assert }) => {
      const session = await authenticateAsAdvisor(client)

      const response = await client.get(`/administrator/${resource}`).cookies(session)

      response.assertStatus(403)
      assert.equal(body(response).code, 'ACCESS_DENIED')
    })
  }

  test('nor does it create an account', async ({ client }) => {
    const session = await authenticateAsAdvisor(client)

    const response = await client.post('/administrator/users').cookies(session).json(NEW_USER)

    response.assertStatus(403)
  })

  test('and does not enter the representative area', async ({ client }) => {
    const session = await authenticateAsAdvisor(client)

    const response = await client.get('/representative/enrollments').cookies(session)

    response.assertStatus(403)
  })
})

test.group('roles > the representative only reaches their own enrollments', (group) => {
  group.each.setup(() => resetDatabase())

  test('panel and advisor area answer 403', async ({ client }) => {
    const { session } = await signInWithFactory(client, 'representative')

    const panel = await client.get('/administrator/classrooms').cookies(session)
    const advisor = await client.get('/advisor/students').cookies(session)

    panel.assertStatus(403)
    advisor.assertStatus(403)
  })

  test('without a linked classroom, the enrollments answer 404', async ({ client, assert }) => {
    const { session } = await signInWithFactory(client, 'representative')

    const response = await client.get('/representative/enrollments').cookies(session)

    response.assertStatus(404)
    assert.equal(body(response).code, 'CLASSROOM_NOT_FOUND')
  })
})

test.group('roles > the administrator passes everywhere', (group) => {
  group.each.setup(() => resetDatabase())

  for (const resource of PANEL) {
    test(`/administrator/${resource} answers 200 to the administrator`, async ({ client }) => {
      const session = await authenticateAsAdministrator(client)

      const response = await client.get(`/administrator/${resource}`).cookies(session)

      response.assertStatus(200)
    })
  }

  test('and covers for the missing advisor in their area', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.get('/advisor/classrooms').cookies(session)

    response.assertStatus(200)
  })

  test('the administrator goes through users from start to end', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)

    const created = await client.post('/administrator/users').cookies(session).json(NEW_USER)
    created.assertStatus(201)

    const id = body(created).id

    const archived = await client.patch(`/administrator/users/${id}/archive`).cookies(session)
    archived.assertStatus(204)

    const deleted = await client.delete(`/administrator/users/${id}`).cookies(session)
    deleted.assertStatus(204)
  })

  test('and archives another administrator, who is not their own account', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)
    const other = await UserFactory.apply('administrator').create()

    const response = await client.patch(`/administrator/users/${other.id}/archive`).cookies(session)

    response.assertStatus(204)
  })
})
