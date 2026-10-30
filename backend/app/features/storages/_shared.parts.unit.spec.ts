import { test } from '@japa/runner'

import { partSizeOf, sizedParts } from './_shared.parts.ts'

test.group('storages/_shared > partes (unit)', () => {
  test('toda parte tem o tamanho cheio, menos a última, que leva o resto', ({ assert }) => {
    assert.equal(partSizeOf(25, 10, 1), 10)
    assert.equal(partSizeOf(25, 10, 2), 10)
    assert.equal(partSizeOf(25, 10, 3), 5)
  })

  test('arquivo de uma parte só tem o tamanho do arquivo', ({ assert }) => {
    assert.equal(partSizeOf(7, 10, 1), 7)
  })

  test('sizedParts casa número e tamanho', ({ assert }) => {
    assert.deepEqual(sizedParts([2, 3], 25, 10), [
      { partNumber: 2, size: 10 },
      { partNumber: 3, size: 5 },
    ])
  })
})
