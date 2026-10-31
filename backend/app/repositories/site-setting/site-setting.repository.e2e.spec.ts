import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { UPLOAD_STATUS } from '@interclasse/shared'

import { SiteSettingLucidRepository } from './site-setting.lucid.repository.ts'
import { SiteSettingMemoryRepository } from './site-setting.memory.repository.ts'
import type { SiteSettingRepository } from './site-setting.repository.ts'

import { resetDatabase } from '#tests/http-fixtures'
import { StorageFactory } from '#database/factories/storage.factory'

/**
 * The same contract in both implementations (`_standards/domain.md` §5.4): it is what
 * guarantees that the use case unit test, which runs on the in-memory one, does not pass
 * against a lying double.
 */
type Subject = {
  readonly repository: SiteSettingRepository
  /** Arranges an uploaded file and returns the id. */
  readonly addFile: (mimetype: string) => Promise<string>
}

const IMPLEMENTATIONS = {
  lucid: async (): Promise<Subject> => ({
    repository: await app.container.make(SiteSettingLucidRepository),
    addFile: async (mimetype) => {
      const file = await StorageFactory.merge({ mimetype }).create()

      return file.id
    },
  }),
  memory: async (): Promise<Subject> => {
    const repository = new SiteSettingMemoryRepository()

    return {
      repository,
      addFile: async (mimetype) => {
        const id = randomUUID()
        repository.withFile({
          id,
          filename: `${id}.bin`,
          originalName: 'arquivo',
          mimetype,
          size: 1024,
          path: `${id}.bin`,
          status: UPLOAD_STATUS.UPLOADED,
          partSize: null,
          uploadId: null,
          createdAt: null,
          updatedAt: null,
          deletedAt: null,
        })

        return id
      },
    }
  },
} satisfies Record<string, () => Promise<Subject>>

const NOW = new Date('2026-10-29T12:00:00.000Z')

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`SiteSettingRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('current is born empty and always returns the same row', async ({ assert }) => {
      const { repository } = await make()

      const first = await repository.current()
      const second = await repository.current()

      assert.equal(first.id, second.id)
      assert.deepInclude(first.snapshot(), {
        about: null,
        organizer: null,
        edition: null,
        regulationId: null,
      })
    })

    test('save and current return what was saved', async ({ assert }) => {
      const { repository } = await make()
      const setting = await repository.current()
      setting.update(
        { about: 'Os jogos do CMEI', edition: 2, schoolInstagram: 'cmei' },
        { regulation: null, now: NOW },
      )

      await repository.save(setting)
      const found = await repository.current()

      // `updatedAt` is left out: Lucid stamps the edit when rewriting the row.
      assert.deepInclude(found.snapshot(), {
        id: setting.id,
        about: 'Os jogos do CMEI',
        edition: 2,
        schoolInstagram: 'cmei',
        organizer: null,
      })
    })

    test('findRegulationFile finds the uploaded file and is null for the unknown one', async ({
      assert,
    }) => {
      const { repository, addFile } = await make()
      const id = await addFile('application/pdf')

      assert.deepEqual(await repository.findRegulationFile(id), { mimetype: 'application/pdf' })
      assert.isNull(await repository.findRegulationFile('0c1f9d1e-8b7a-4c3d-9e2f-1a2b3c4d5e6f'))
    })

    test('show without a regulation returns regulation null', async ({ assert }) => {
      const { repository } = await make()

      const shown = await repository.show()

      assert.isNull(shown.regulation)
      assert.isNull(shown.regulationId)
      assert.isNull(shown.about)
    })

    test('show and showPublic bring the regulation after it is saved', async ({ assert }) => {
      const { repository, addFile } = await make()
      const id = await addFile('application/pdf')
      const setting = await repository.current()
      setting.update(
        { regulationId: id, edition: 4 },
        { regulation: { mimetype: 'application/pdf' }, now: NOW },
      )
      await repository.save(setting)

      const shown = await repository.show()
      const publicView = await repository.showPublic()

      assert.equal(shown.regulation?.id, id)
      assert.equal(shown.edition, 4)
      assert.equal(publicView.edition, 4)
      assert.equal(publicView.regulation?.path, shown.regulation?.path)
    })
  })
}
