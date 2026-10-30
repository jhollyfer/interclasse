import { test } from '@japa/runner'
import { UPLOAD_STATUS } from '@interclasse/shared'

import AdministratorSiteUpdateUseCase from './update.use-case.ts'

import { SiteSettingRepository } from '#repositories/site-setting/site-setting.repository'
import { SiteSettingMemoryRepository } from '#repositories/site-setting/site-setting.memory.repository'
import { makeWithMemory } from '#tests/container-fixtures'

const PDF_ID = '4b6f2c1e-3f2a-4c8e-9a1b-0f6d2e7c8a91'
const PNG_ID = '7e1d3c2b-1a0f-4e9d-8c7b-6a5f4e3d2c1b'

function file(id: string, mimetype: string) {
  return {
    id,
    filename: `${id}.bin`,
    originalName: 'regulamento.pdf',
    mimetype,
    size: 1024,
    path: `${id}.bin`,
    status: UPLOAD_STATUS.UPLOADED,
    partSize: null,
    uploadId: null,
    url: 'https://bucket.test/regulamento',
    createdAt: null,
    updatedAt: null,
    deletedAt: null,
  }
}

async function setup() {
  const settings = new SiteSettingMemoryRepository()
    .withFile(file(PDF_ID, 'application/pdf'))
    .withFile(file(PNG_ID, 'image/png'))
  const useCase = await makeWithMemory(AdministratorSiteUpdateUseCase, [
    [SiteSettingRepository, settings],
  ])

  return { settings, useCase }
}

test.group('administrator/site > update (unit)', () => {
  test('grava o que veio e devolve a configuração', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ about: 'Os jogos do CMEI', edition: 2 })

    assert.isTrue(result.isRight())
    assert.deepInclude(result.value, { about: 'Os jogos do CMEI', edition: 2, organizer: null })
  })

  test('null apaga o campo e ausente não mexe', async ({ assert }) => {
    const { useCase } = await setup()
    await useCase.execute({ organizer: 'Professores', edition: 3 })

    const result = await useCase.execute({ organizer: null })

    assert.deepInclude(result.value, { organizer: null, edition: 3 })
  })

  test('aceita regulamento em PDF e devolve o arquivo', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ regulationId: PDF_ID })

    assert.isTrue(result.isRight())
    assert.isTrue(result.isRight() && result.value.regulation?.id === PDF_ID)
  })

  test('regulamento que não é PDF é 422 REGULATION_NOT_PDF', async ({ assert }) => {
    const { settings, useCase } = await setup()

    const result = await useCase.execute({ regulationId: PNG_ID })

    assert.deepInclude(result.value, { status: 422, code: 'REGULATION_NOT_PDF' })
    const current = await settings.current()
    assert.isNull(current.snapshot().regulationId)
  })

  test('arquivo desconhecido é 422 STORAGE_NOT_FOUND apontando o campo', async ({ assert }) => {
    const { useCase } = await setup()

    const result = await useCase.execute({ regulationId: '0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f' })

    assert.deepInclude(result.value, { status: 422, code: 'STORAGE_NOT_FOUND' })
    assert.isTrue(result.isLeft() && 'regulationId' in (result.value.errors ?? {}))
  })

  test('null tira o regulamento', async ({ assert }) => {
    const { useCase } = await setup()
    await useCase.execute({ regulationId: PDF_ID })

    const result = await useCase.execute({ regulationId: null })

    assert.deepInclude(result.value, { regulationId: null, regulation: null })
  })
})
