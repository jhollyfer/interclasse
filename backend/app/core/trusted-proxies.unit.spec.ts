import { test } from '@japa/runner'

import { TrustedProxies } from '#core/trusted-proxies'

/**
 * `TRUSTED_PROXIES` is documented as `loopback,uniquelocal`. Handed raw to proxy-addr that
 * string is one invalid address, and `request.ip()` throws on every request.
 */
test.group('TrustedProxies', () => {
  test('a compound value trusts each entry', ({ assert }) => {
    const trust = TrustedProxies.compile('loopback, uniquelocal')

    assert.isTrue(trust('127.0.0.1', 0))
    assert.isTrue(trust('10.1.2.3', 0))
    assert.isTrue(trust('172.18.0.5', 0))
    assert.isFalse(trust('203.0.113.9', 0))
  })

  test('when absent, only loopback is trusted', ({ assert }) => {
    const trust = TrustedProxies.compile(undefined)

    assert.isTrue(trust('127.0.0.1', 0))
    assert.isFalse(trust('10.1.2.3', 0))
  })

  test('a single value and a subnet work', ({ assert }) => {
    assert.isTrue(TrustedProxies.compile('loopback')('::1', 0))
    assert.isTrue(TrustedProxies.compile('10.0.0.0/8')('10.9.9.9', 0))
    assert.isFalse(TrustedProxies.compile('10.0.0.0/8')('11.0.0.1', 0))
  })

  test('refuses an empty value, or one that is only separators', ({
    assert,
  }) => {
    assert.throws(() => TrustedProxies.compile(''), /TRUSTED_PROXIES/)
    assert.throws(() => TrustedProxies.compile(' , '), /TRUSTED_PROXIES/)
  })

  test('refuses an invalid entry', ({ assert }) => {
    assert.throws(
      () => TrustedProxies.compile('loopback,not-an-address'),
      /TRUSTED_PROXIES/,
    )
  })

  test('never trusts everyone: true, *, and the catch-all ranges', ({
    assert,
  }) => {
    for (const value of [
      'true',
      '*',
      'TRUE',
      'loopback,true',
      '0.0.0.0/0',
      '::/0',
      '0.0.0.0/0,loopback',
    ]) {
      assert.throws(
        () => TrustedProxies.compile(value),
        /TRUSTED_PROXIES/,
        value,
      )
    }
  })

  test('validate returns the raw value the schema keeps', ({ assert }) => {
    assert.equal(
      TrustedProxies.validate('TRUSTED_PROXIES', 'loopback,uniquelocal'),
      'loopback,uniquelocal',
    )
    assert.isUndefined(TrustedProxies.validate('TRUSTED_PROXIES', undefined))
    assert.throws(
      () => TrustedProxies.validate('TRUSTED_PROXIES', 'true'),
      /TRUSTED_PROXIES/,
    )
  })
})
