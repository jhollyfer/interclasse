import { test } from '@japa/runner'

import { body } from '#tests/http-fixtures'

/**
 * A allowlist de `config/cors.ts`, que vem de `CORS_ORIGINS`.
 *
 * O teste roda fora de desenvolvimento - `NODE_ENV=test` -, que é a única
 * condição em que a lista vale: em dev a configuração libera qualquer origem e
 * não haveria o que medir. A rota escolhida é `/health-check`, porque é pública e o
 * que se afere é o cabeçalho da resposta, não o corpo.
 */
test.group('cors > allowlist', () => {
  test('origem na allowlist recebe o cabeçalho', async ({ client, assert }) => {
    const response = await client.get('/health-check').header('origin', 'http://localhost:5173')

    response.assertStatus(200)
    assert.equal(response.header('access-control-allow-origin'), 'http://localhost:5173')
    // Com credencial o navegador só aceita origem nomeada, nunca `*`: sem este
    // cabeçalho o cookie de sessão não sobe na requisição cross-origin.
    assert.equal(response.header('access-control-allow-credentials'), 'true')
  })

  test('origem fora da allowlist não recebe o cabeçalho', async ({ client, assert }) => {
    const response = await client.get('/health-check').header('origin', 'http://intruso.example')

    // A requisição em si passa - CORS é decisão do navegador, e o servidor
    // apenas deixa de autorizar. Sem o cabeçalho, o navegador descarta a
    // resposta.
    response.assertStatus(200)
    assert.isUndefined(response.header('access-control-allow-origin'))
  })
})

/**
 * A barreira de CSRF: toda escrita confere a origem, qualquer que seja o `Content-Type`.
 * O caso sem `Origin` e sem `Sec-Fetch-Site` é do `origin.middleware.unit.spec.ts`:
 * o cliente de teste sempre manda a origem da allowlist (`tests/bootstrap.ts`).
 *
 * `config/shield.ts` tem `csrf.enabled: false`, e o bodyparser aceita
 * `multipart/form-data` e `application/x-www-form-urlencoded` — content-types
 * **simples**, que um `<form>` de outra origem envia sem preflight nenhum. Em
 * produção o cookie viaja junto, que é exatamente a condição de um CSRF.
 *
 * `origin_middleware` é quem fecha isso, e este grupo é o que impede a barreira
 * de sumir sem ninguém notar: ela não tem efeito visível em requisição
 * legítima, então nada mais reprovaria a sua remoção.
 */
test.group('cors > escrita cross-origin', () => {
  test('origem fora da allowlist é recusada com 403', async ({ client, assert }) => {
    const response = await client
      .post('/authentication/sign-in')
      .header('origin', 'http://intruso.example')
      .header('content-type', 'application/x-www-form-urlencoded')
      .field('email', 'quem@exemplo.com')
      .field('password', 'nao-importa')

    response.assertStatus(403)
    assert.equal(body(response).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('origem na allowlist passa da barreira', async ({ client, assert }) => {
    const response = await client
      .post('/authentication/sign-in')
      .header('origin', 'http://localhost:5173')
      .header('content-type', 'application/x-www-form-urlencoded')
      .field('email', 'quem@exemplo.com')
      .field('password', 'nao-importa')

    // Passa da barreira e chega ao validator ou às credenciais: o que importa
    // é **não** ser o 403 de origem.
    assert.notEqual(body(response).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('JSON de origem fora da allowlist também é recusado', async ({ client, assert }) => {
    // A barreira não olha `Content-Type`: `text/plain` e POST vazio também cruzam
    // sites sem preflight (_standards/backend.md §4.10).
    const response = await client
      .post('/authentication/sign-in')
      .header('origin', 'http://intruso.example')
      .json({ email: 'quem@exemplo.com', password: 'nao-importa' })

    response.assertStatus(403)
    assert.equal(body(response).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('text/plain de origem fora da allowlist é recusado', async ({ client, assert }) => {
    const response = await client
      .post('/authentication/sign-out')
      .header('origin', 'http://intruso.example')
      .header('content-type', 'text/plain')

    response.assertStatus(403)
    assert.equal(body(response).code, 'ORIGIN_NOT_ALLOWED')
  })
})
