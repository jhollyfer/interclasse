import { test } from '@japa/runner'

import { body } from '#tests/helpers'

/**
 * A allowlist de `config/cors.ts`, que vem de `CORS_ORIGIN`.
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
 * A barreira de CSRF dos content-types que não disparam preflight.
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
test.group('cors > escrita cross-origin em content type simples', () => {
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

  test('sem header de origem passa: não é navegador', async ({ client, assert }) => {
    // Postman, mobile e servidor não mandam `Origin`. A mesma decisão que o
    // `origin` do CORS já toma.
    const response = await client
      .post('/authentication/sign-in')
      .header('content-type', 'application/x-www-form-urlencoded')
      .field('email', 'quem@exemplo.com')
      .field('password', 'nao-importa')

    assert.notEqual(body(response).code, 'ORIGIN_NOT_ALLOWED')
  })

  test('JSON não passa pela barreira: o preflight já o cobre', async ({ client, assert }) => {
    // `application/json` deixa a requisição de ser simples, o navegador é
    // obrigado ao preflight, e o preflight bate na allowlist do CORS. Barrar
    // aqui também seria cobrar duas vezes o mesmo pedágio.
    const response = await client
      .post('/authentication/sign-in')
      .header('origin', 'http://intruso.example')
      .json({ email: 'quem@exemplo.com', password: 'nao-importa' })

    assert.notEqual(body(response).code, 'ORIGIN_NOT_ALLOWED')
  })
})
