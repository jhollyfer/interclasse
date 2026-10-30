import { test } from '@japa/runner'
import { UPLOAD_STATUS } from '@interclasse/shared'

import StorefrontSiteShowUseCase from './show.use-case.ts'

import { SiteSettingRepository } from '#repositories/site-setting/site-setting.repository'
import { SiteSettingMemoryRepository } from '#repositories/site-setting/site-setting.memory.repository'
import { makeWithMemory } from '#tests/container-fixtures'

const PDF_ID = '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91'

test.group('storefront/site > show (unit)', () => {
  test('sem nada preenchido, o site recebe tudo vazio e sem regulamento', async ({ assert }) => {
    const useCase = await makeWithMemory(StorefrontSiteShowUseCase, [
      [SiteSettingRepository, new SiteSettingMemoryRepository()],
    ])

    const result = await useCase.execute()

    assert.deepEqual(result.value, {
      about: null,
      organizer: null,
      firstEditionYear: null,
      edition: null,
      schoolInstagram: null,
      developerInstagram: null,
      regulation: null,
    })
  })

  test('o regulamento sai só com URL, nome e tamanho', async ({ assert }) => {
    const settings = new SiteSettingMemoryRepository().withFile({
      id: PDF_ID,
      filename: 'f.pdf',
      originalName: 'regulamento.pdf',
      mimetype: 'application/pdf',
      size: 2048,
      path: 'segredo/f.pdf',
      status: UPLOAD_STATUS.UPLOADED,
      partSize: null,
      uploadId: null,
      url: 'https://bucket.test/regulamento',
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
    })
    const setting = await settings.current()
    setting.update(
      { regulationId: PDF_ID },
      { regulation: { mimetype: 'application/pdf' }, now: new Date() },
    )
    await settings.save(setting)
    const useCase = await makeWithMemory(StorefrontSiteShowUseCase, [
      [SiteSettingRepository, settings],
    ])

    const result = await useCase.execute()

    assert.deepEqual(result.isRight() && result.value.regulation, {
      url: 'https://bucket.test/regulamento',
      originalName: 'regulamento.pdf',
      size: 2048,
    })
  })
})
