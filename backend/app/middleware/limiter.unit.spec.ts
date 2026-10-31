import { test } from '@japa/runner'

import { LimiterKey } from '#start/limiter'

test.group('start/limiter > LimiterKey (unit)', () => {
  test('the account e-mail is normalized: trim and lower case', ({ assert }) => {
    assert.equal(LimiterKey.account('  Ana@Escola.COM '), 'signin:ana@escola.com')
    assert.equal(LimiterKey.account('ana@escola.com'), LimiterKey.account('ANA@ESCOLA.COM'))
  })

  test('without a usable e-mail there is no account key', ({ assert }) => {
    assert.isNull(LimiterKey.account(undefined))
    assert.isNull(LimiterKey.account(42))
    assert.isNull(LimiterKey.account('   '))
  })

  test('the per-user key carries the scope and the id', ({ assert }) => {
    assert.equal(LimiterKey.user('upload', { id: 'u1' }), 'upload:u1')
    assert.notEqual(
      LimiterKey.user('upload', { id: 'u1' }),
      LimiterKey.user('export', { id: 'u1' }),
    )
  })

  test('without a session there is no per-user key', ({ assert }) => {
    assert.isNull(LimiterKey.user('upload', undefined))
  })
})
