import { test } from '@japa/runner'

import User from '#models/user'
import { UserFactory } from '#database/factories/user.factory'
import {
  ADMINISTRATOR,
  authenticate,
  authenticateAsAdministrator,
  body,
  resetDatabase,
} from '#tests/helpers'

/**
 * A atualização parcial, e as duas regras que a acompanham.
 *
 * `backend-old` usava `PATCH` com um validator que exigia `name`, `email`,
 * `role` e `avatarId` em todo pedido: o verbo prometia parcial e o schema
 * recusava parcial. Aqui o `PUT` é parcial de verdade, e o teste do
 * campo ausente é o que impede a regressão para o schema exigente.
 *
 * As outras afirmam o que o merge sozinho não garante: senha nova igual à
 * atual é 422, e trocar a senha derruba a sessão em curso - sem isso um token
 * anterior à troca sobreviveria a ela.
 *
 * E as três de `currentPassword`, que é prova de identidade e não de força: a
 * sessão prova posse do cookie, então sem a senha atual quem sequestra um
 * cookie troca a senha do dono da conta. `backend-old` já exigia
 * (`profile.validator.ts:15`); a migração tinha deixado a exigência para trás.
 */
test.group('conta > atualização', (group) => {
  group.each.setup(() => resetDatabase())

  test('payload parcial não apaga o campo ausente', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.put('/account').cookies(session).json({ name: 'Outro Nome' })

    response.assertStatus(200)
    assert.equal(body(response).name, 'Outro Nome')
    assert.equal(body(response).email, ADMINISTRATOR.email)

    // E a linha no banco também: nem `email` nem `role` foram tocados.
    const user = await User.findByOrFail('email', ADMINISTRATOR.email)
    assert.equal(user.name, 'Outro Nome')
    assert.equal(user.role, 'ADMINISTRATOR')
  })

  test('senha nova igual à atual responde 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.put('/account').cookies(session).json({
      password: ADMINISTRATOR.password,
      passwordConfirmation: ADMINISTRATOR.password,
      currentPassword: ADMINISTRATOR.password,
    })

    response.assertStatus(422)
    assert.equal(body(response).code, 'PASSWORD_SAME_AS_CURRENT')
  })

  test('trocar a senha sem a atual responde 422 apontando o campo', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .put('/account')
      .cookies(session)
      .json({ password: 'Outra-Senha1!', passwordConfirmation: 'Outra-Senha1!' })

    response.assertStatus(422)
    assert.property(body(response).errors, 'currentPassword')

    // E a senha continua sendo a de antes: a sessão nova é a prova.
    await authenticate(client, ADMINISTRATOR.email, ADMINISTRATOR.password)
  })

  test('senha atual errada responde 422', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client.put('/account').cookies(session).json({
      password: 'Outra-Senha1!',
      passwordConfirmation: 'Outra-Senha1!',
      currentPassword: 'Nao-E-A-Atual1!',
    })

    response.assertStatus(422)
    assert.equal(body(response).code, 'CURRENT_PASSWORD_INVALID')

    await authenticate(client, ADMINISTRATOR.email, ADMINISTRATOR.password)
  })

  test('o resto do payload não exige a senha atual', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)

    // `requiredIfExists('password')`: sem `password` no payload não há
    // identidade a provar, e cobrar a senha atual para trocar o nome tornaria
    // toda edição de perfil um formulário de senha.
    const response = await client.put('/account').cookies(session).json({ name: 'Sem Senha' })

    response.assertStatus(200)
    assert.equal(body(response).name, 'Sem Senha')
  })

  test('trocar a senha derruba a sessão em curso', async ({ client }) => {
    const session = await authenticateAsAdministrator(client)

    const troca = await client.put('/account').cookies(session).json({
      password: 'Outra-Senha1!',
      passwordConfirmation: 'Outra-Senha1!',
      currentPassword: ADMINISTRATOR.password,
    })

    troca.assertStatus(200)

    // O mesmo cookie que acabou de funcionar, agora sem token que o sustente.
    const depois = await client.get('/account').cookies(session)

    depois.assertStatus(401)
  })

  test('e-mail já usado por outra conta responde 409', async ({ client, assert }) => {
    const outro = await UserFactory.create()
    const session = await authenticateAsAdministrator(client)

    const response = await client.put('/account').cookies(session).json({ email: outro.email })

    response.assertStatus(409)
    assert.equal(body(response).code, 'USER_ALREADY_EXISTS')
  })

  test('avatarId inexistente responde 422 em vez de estourar a chave estrangeira', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .put('/account')
      .cookies(session)
      .json({ avatarId: '00000000-0000-4000-8000-000000000000' })

    response.assertStatus(422)
    assert.equal(body(response).code, 'STORAGE_NOT_FOUND')
  })
})
