import { test } from '@japa/runner'

import { SiteSetting } from './site-setting.entity.ts'

const NOW = new Date('2026-10-29T12:00:00Z')
const LATER = new Date('2026-10-30T12:00:00Z')
const FILE_ID = '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91'

function empty(): SiteSetting {
  return SiteSetting.create({ id: 'site', now: NOW })
}

test.group('SiteSetting', () => {
  test('is born with everything empty', ({ assert }) => {
    assert.deepEqual(empty().snapshot(), {
      id: 'site',
      about: null,
      organizer: null,
      firstEditionYear: null,
      edition: null,
      schoolInstagram: null,
      developerInstagram: null,
      regulationId: null,
      createdAt: NOW,
      updatedAt: NOW,
    })
  })

  test('absent leaves alone and null erases', ({ assert }) => {
    const setting = empty()
    setting.update({ organizer: 'Professores', edition: 3 }, { regulation: null, now: LATER })

    const result = setting.update({ organizer: null }, { regulation: null, now: LATER })

    assert.isTrue(result.isRight())
    assert.deepInclude(setting.snapshot(), { organizer: null, edition: 3, updatedAt: LATER })
  })

  test('accepts the rulebook as a PDF', ({ assert }) => {
    const setting = empty()

    const result = setting.update(
      { regulationId: FILE_ID },
      { regulation: { mimetype: 'application/pdf' }, now: LATER },
    )

    assert.isTrue(result.isRight())
    assert.equal(setting.snapshot().regulationId, FILE_ID)
  })

  test('refuses a regulation that was not found', ({ assert }) => {
    const setting = empty()

    const result = setting.update({ regulationId: FILE_ID }, { regulation: null, now: LATER })

    assert.deepEqual(result.value, { code: 'STORAGE_NOT_FOUND' })
    assert.isNull(setting.snapshot().regulationId)
  })

  test('refuses a regulation that is not a PDF and writes nothing', ({ assert }) => {
    const setting = empty()

    const result = setting.update(
      { regulationId: FILE_ID, edition: 5 },
      { regulation: { mimetype: 'image/png' }, now: LATER },
    )

    assert.deepEqual(result.value, { code: 'REGULATION_NOT_PDF' })
    assert.deepInclude(setting.snapshot(), { regulationId: null, edition: null })
  })

  test('removing the regulation with null does not check a file', ({ assert }) => {
    const setting = empty()
    setting.update(
      { regulationId: FILE_ID },
      { regulation: { mimetype: 'application/pdf' }, now: LATER },
    )

    const result = setting.update({ regulationId: null }, { regulation: null, now: LATER })

    assert.isTrue(result.isRight())
    assert.isNull(setting.snapshot().regulationId)
  })

  test('replacesRegulation only holds for a new id', ({ assert }) => {
    const setting = empty()

    assert.isTrue(setting.replacesRegulation(FILE_ID))
    assert.isFalse(setting.replacesRegulation(null))
    assert.isFalse(setting.replacesRegulation(undefined))
  })
})
