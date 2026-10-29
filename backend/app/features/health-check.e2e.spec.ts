import { test } from '@japa/runner'

/** `GET /health-check`: a sonda de vida do container. Sem sessão, sem banco. */
test.group('health-check', () => {
  test('a sonda responde ok e não conta nada da infraestrutura', async ({ client, assert }) => {
    const response = await client.get('/health-check')

    response.assertStatus(200)

    // Igualdade profunda, e não `assertBodyContains`: o que se afirma é que o
    // corpo é **só** isto. Uso de disco, memória ou contagem de conexões numa
    // sonda pública seria informação de infraestrutura de graça para quem pedir.
    assert.deepEqual(response.body(), { status: 'ok' })
    assert.equal(response.header('cache-control'), 'no-store')
  })

  test('a sonda não exige sessão', async ({ client }) => {
    const response = await client.get('/health-check').redirects(0)

    response.assertStatus(200)
  })
})
