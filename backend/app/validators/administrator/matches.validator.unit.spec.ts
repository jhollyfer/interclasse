import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { AdministratorMatchUpdateValidator } from './matches.validator.ts'

/**
 * O `scheduledAt` tem três estados e o tipo tem de dizer os três: ausente
 * (`undefined`, "não mexer"), `null` (desmarca) e a data. Antes o tipo
 * prometia `DateTime | null` e o campo ausente chegava como `undefined`.
 */
test.group('validators/administrator/matches > scheduledAt (unit)', () => {
  test('campo ausente chega como undefined', async ({ assert }) => {
    const payload = await AdministratorMatchUpdateValidator.validate({})

    assert.isUndefined(payload.scheduledAt)
  })

  test('null desmarca e chega como null', async ({ assert }) => {
    const payload = await AdministratorMatchUpdateValidator.validate({ scheduledAt: null })

    assert.isNull(payload.scheduledAt)
  })

  test('ISO com fuso vira DateTime do Luxon', async ({ assert }) => {
    const payload = await AdministratorMatchUpdateValidator.validate({
      scheduledAt: '2026-11-03T14:30:00-04:00',
    })

    assert.isTrue(DateTime.isDateTime(payload.scheduledAt))
    assert.equal(payload.scheduledAt?.toUTC().toISO(), '2026-11-03T18:30:00.000Z')
  })

  test('data sem fuso é recusada', async ({ assert }) => {
    await assert.rejects(() =>
      AdministratorMatchUpdateValidator.validate({ scheduledAt: '2026-11-03' }),
    )
  })
})
