import { test } from '@japa/runner'
import { USER_ROLE } from '@interclasse/shared'

import { ClassroomFactory } from '#database/factories/classroom.factory'
import { FACTORY_PASSWORD, UserFactory } from '#database/factories/user.factory'
import {
  ADMINISTRATOR,
  authenticateAsAdministrator,
  body,
  resetDatabase,
} from '#tests/http-fixtures'

/**
 * The "allowlist leak" net (_standards/backend.md §7): no response
 * carries a credential key at any level of the tree, nor the password value
 * anywhere. The routes are the ones that return an account, directly or nested
 * (classroom with advisor and representative, photo with author, announcement with actor).
 */
const FORBIDDEN_KEYS =
  /^(password|passwordHash|currentPassword|token|tokenHash|hash|secret|rememberMeToken)$/i

/** Every forbidden-key path in a JSON tree. */
function forbiddenPaths(value: unknown, path = '$'): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) => forbiddenPaths(item, `${path}[${index}]`))
  if (typeof value !== 'object' || value === null) return []

  return Object.entries(value).flatMap(([key, child]) => {
    const here = `${path}.${key}`
    const own: string[] = []
    if (FORBIDDEN_KEYS.test(key)) own.push(here)

    return [...own, ...forbiddenPaths(child, here)]
  })
}

test.group('responses > leak (e2e)', (group) => {
  group.each.setup(() => resetDatabase())

  test('routes that return an account carry neither credential nor password', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const advisor = await UserFactory.create()
    const representative = await UserFactory.apply('representative').create()
    const classroom = await ClassroomFactory.merge({
      advisorId: advisor.id,
      representativeId: representative.id,
    }).create()

    const paths = [
      '/account',
      '/administrator/users',
      `/administrator/users/${advisor.id}`,
      '/administrator/classrooms',
      `/administrator/classrooms/${classroom.id}`,
      '/administrator/photos',
      '/administrator/enrollment-removals',
    ]

    for (const path of paths) {
      const response = await client.get(path).cookies(session)
      response.assertStatus(200)

      assert.deepEqual(forbiddenPaths(body(response)), [], `${path}: forbidden key in the response`)
      assert.notInclude(
        response.text(),
        FACTORY_PASSWORD,
        `${path}: password value in the response`,
      )
      assert.notInclude(response.text(), ADMINISTRATOR.password, `${path}: administrator password`)
    }
  })

  test('creating and updating an account also respond without credentials', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const created = await client.post('/administrator/users').cookies(session).json({
      name: 'Nova Conta',
      email: 'nova@mail.com',
      role: USER_ROLE.ADVISOR,
      password: 'Senha1234!',
      passwordConfirmation: 'Senha1234!',
    })
    created.assertStatus(201)
    const updated = await client
      .put(`/administrator/users/${body(created).id}`)
      .cookies(session)
      .json({ name: 'Outro Nome' })
    updated.assertStatus(200)

    for (const response of [created, updated]) {
      assert.deepEqual(forbiddenPaths(body(response)), [])
      assert.notInclude(response.text(), 'Senha1234!')
    }
  })

  test('the scan sees a forbidden key at any level', ({ assert }) => {
    const leaked = forbiddenPaths({ data: [{ advisor: { password: 'x' } }], token: 'y' })

    assert.deepEqual(leaked, ['$.data[0].advisor.password', '$.token'])
  })
})
