import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { AdministratorMatchUpdateValidator } from './matches.validator.ts'

/**
 * `scheduledAt` has three states and the type must say all three: absent
 * (`undefined`, "leave alone"), `null` (unschedule) and the date. Before, the type
 * promised `DateTime | null` and the absent field arrived as `undefined`.
 */
test.group('validators/administrator/matches > scheduledAt (unit)', () => {
  test('an absent field arrives as undefined', async ({ assert }) => {
    const payload = await AdministratorMatchUpdateValidator.validate({})

    assert.isUndefined(payload.scheduledAt)
  })

  test('null unschedules and arrives as null', async ({ assert }) => {
    const payload = await AdministratorMatchUpdateValidator.validate({ scheduledAt: null })

    assert.isNull(payload.scheduledAt)
  })

  test('ISO with offset becomes a Luxon DateTime', async ({ assert }) => {
    const payload = await AdministratorMatchUpdateValidator.validate({
      scheduledAt: '2026-11-03T14:30:00-04:00',
    })

    assert.isTrue(DateTime.isDateTime(payload.scheduledAt))
    assert.equal(payload.scheduledAt?.toUTC().toISO(), '2026-11-03T18:30:00.000Z')
  })

  test('a date without offset is refused', async ({ assert }) => {
    await assert.rejects(() =>
      AdministratorMatchUpdateValidator.validate({ scheduledAt: '2026-11-03' }),
    )
  })
})
