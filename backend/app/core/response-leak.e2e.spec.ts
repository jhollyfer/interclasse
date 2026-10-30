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
 * A rede "vazamento por allowlist" (_standards/backend.md §7): nenhuma resposta
 * carrega chave de credencial em nenhum nível da árvore, nem o valor da senha
 * em lugar nenhum. As rotas são as que devolvem conta, direta ou aninhada
 * (turma com conselheiro e representante, foto com autor, aviso com ator).
 */
const FORBIDDEN_KEYS =
  /^(password|passwordHash|currentPassword|token|tokenHash|hash|secret|rememberMeToken)$/i

/** Todo caminho de chave proibida numa árvore de JSON. */
function forbiddenPaths(value: unknown, path = '$'): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) => forbiddenPaths(item, `${path}[${index}]`))
  if (typeof value !== 'object' || value === null) return []

  return Object.entries(value).flatMap(([key, child]) => {
    const here = `${path}.${key}`
    const own = FORBIDDEN_KEYS.test(key) ? [here] : []

    return [...own, ...forbiddenPaths(child, here)]
  })
}

test.group('respostas > vazamento (e2e)', (group) => {
  group.each.setup(() => resetDatabase())

  test('rotas que devolvem conta não carregam credencial nem a senha', async ({
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

      assert.deepEqual(forbiddenPaths(body(response)), [], `${path}: chave proibida na resposta`)
      assert.notInclude(response.text(), FACTORY_PASSWORD, `${path}: valor da senha na resposta`)
      assert.notInclude(response.text(), ADMINISTRATOR.password, `${path}: senha do administrador`)
    }
  })

  test('criar e atualizar conta também respondem sem credencial', async ({ client, assert }) => {
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

  test('a varredura enxerga chave proibida em qualquer nível', ({ assert }) => {
    const leaked = forbiddenPaths({ data: [{ advisor: { password: 'x' } }], token: 'y' })

    assert.deepEqual(leaked, ['$.data[0].advisor.password', '$.token'])
  })
})
