import { test } from '@japa/runner'

import { DatabaseGuard } from '#tests/database-guard'

test.group('tests > database-guard (unit)', () => {
  test('aceita o banco que termina em _test', ({ assert }) => {
    assert.doesNotThrow(() =>
      DatabaseGuard.assertTestDatabase('postgres://u:p@localhost:5434/interclasse_test'),
    )
  })

  test('aceita a query string depois do nome do banco', ({ assert }) => {
    assert.doesNotThrow(() =>
      DatabaseGuard.assertTestDatabase('postgres://u:p@localhost/interclasse_test?sslmode=disable'),
    )
  })

  test('recusa o banco de desenvolvimento', ({ assert }) => {
    assert.throws(
      () => DatabaseGuard.assertTestDatabase('postgres://u:p@localhost:5434/interclasse'),
      /recusa subir/,
    )
  })

  test('recusa _test no meio do nome', ({ assert }) => {
    assert.throws(
      () => DatabaseGuard.assertTestDatabase('postgres://u:p@localhost/interclasse_test_prod'),
      /recusa subir/,
    )
  })

  test('recusa URL ausente', ({ assert }) => {
    assert.throws(() => DatabaseGuard.assertTestDatabase(undefined), /DATABASE_URL ausente/)
  })
})
