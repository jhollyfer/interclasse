import { test } from '@japa/runner'

import { LimiterKey } from '#start/limiter'

test.group('start/limiter > LimiterKey (unit)', () => {
  test('o e-mail da conta é normalizado: trim e minúsculas', ({ assert }) => {
    assert.equal(LimiterKey.account('  Ana@Escola.COM '), 'signin:ana@escola.com')
    assert.equal(LimiterKey.account('ana@escola.com'), LimiterKey.account('ANA@ESCOLA.COM'))
  })

  test('sem e-mail utilizável não há chave de conta', ({ assert }) => {
    assert.isNull(LimiterKey.account(undefined))
    assert.isNull(LimiterKey.account(42))
    assert.isNull(LimiterKey.account('   '))
  })

  test('a chave por usuário leva o escopo e o id', ({ assert }) => {
    assert.equal(LimiterKey.user('upload', { id: 'u1' }), 'upload:u1')
    assert.notEqual(
      LimiterKey.user('upload', { id: 'u1' }),
      LimiterKey.user('export', { id: 'u1' }),
    )
  })

  test('sem sessão não há chave por usuário', ({ assert }) => {
    assert.isNull(LimiterKey.user('upload', undefined))
  })
})
