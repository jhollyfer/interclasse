import { randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { UPLOAD_STATUS } from '@interclasse/shared'

import {
  SiteSettingRepository,
  type PublicSiteSettingRead,
  type SiteSettingRead,
} from './site-setting.repository.ts'

import SiteSettingModel from '#models/site-setting'
import StorageModel from '#models/storage'
import { SiteSetting, type RegulationFile } from '#domain/site-setting/site-setting.entity'
import { TransactionContext } from '#repositories/unit-of-work/transaction-context'

@inject()
export class SiteSettingLucidRepository extends SiteSettingRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async current(): Promise<SiteSetting> {
    const client = this.transaction.client()
    const row = await SiteSettingModel.query({ client }).first()
    if (row) return this.toEntity(row)

    // Duas primeiras leituras simultâneas: o índice único `site_settings_singleton`
    // deixa uma criar a linha, e a outra não faz nada e lê a que ficou. Insere
    // com `on conflict do nothing` e não captura a violação, porque o erro
    // abortaria a transação em curso.
    const now = new Date()
    const born = SiteSetting.create({ id: randomUUID(), now })
    await client.rawQuery(
      'insert into site_settings (id, created_at, updated_at) values (?, ?, ?) on conflict do nothing',
      [born.id, now, now],
    )
    const winner = await SiteSettingModel.query({ client }).first()
    if (!winner) return born

    return this.toEntity(winner)
  }

  async findRegulationFile(id: string): Promise<RegulationFile | null> {
    const file = await StorageModel.query({ client: this.transaction.client() })
      .where('id', id)
      .where('status', UPLOAD_STATUS.UPLOADED)
      .withScopes((scopes) => scopes.notDeleted())
      .first()
    if (!file) return null

    return { mimetype: file.mimetype }
  }

  async save(setting: SiteSetting): Promise<void> {
    const { id, createdAt, updatedAt, ...columns } = setting.snapshot()

    await SiteSettingModel.updateOrCreate(
      { id },
      {
        ...columns,
        createdAt: DateTime.fromJSDate(createdAt),
        updatedAt: this.dateOrNull(updatedAt),
      },
      { client: this.transaction.client() },
    )
  }

  async show(): Promise<SiteSettingRead> {
    const current = await this.current()
    const setting = current.snapshot()
    const regulation = await this.regulationOf(setting.regulationId)

    return {
      id: setting.id,
      about: setting.about,
      organizer: setting.organizer,
      firstEditionYear: setting.firstEditionYear,
      edition: setting.edition,
      schoolInstagram: setting.schoolInstagram,
      developerInstagram: setting.developerInstagram,
      regulationId: setting.regulationId,
      regulation: this.toRegulationResponse(regulation),
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt?.toISOString() ?? null,
    }
  }

  async showPublic(): Promise<PublicSiteSettingRead> {
    const current = await this.current()
    const setting = current.snapshot()
    const regulation = await this.regulationOf(setting.regulationId)

    return {
      about: setting.about,
      organizer: setting.organizer,
      firstEditionYear: setting.firstEditionYear,
      edition: setting.edition,
      schoolInstagram: setting.schoolInstagram,
      developerInstagram: setting.developerInstagram,
      regulation: regulation && {
        path: regulation.path,
        originalName: regulation.originalName,
        size: regulation.size,
      },
    }
  }

  /** O arquivo do regulamento, quando há; `null` sem regulamento ou com o arquivo já apagado. */
  private async regulationOf(id: string | null): Promise<StorageModel | null> {
    if (!id) return null

    return StorageModel.query({ client: this.transaction.client() }).where('id', id).first()
  }

  private toEntity(row: SiteSettingModel): SiteSetting {
    return SiteSetting.restore({
      id: row.id,
      about: row.about,
      organizer: row.organizer,
      firstEditionYear: row.firstEditionYear,
      edition: row.edition,
      schoolInstagram: row.schoolInstagram,
      developerInstagram: row.developerInstagram,
      regulationId: row.regulationId,
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt?.toJSDate() ?? null,
    })
  }

  private toRegulationResponse(file: StorageModel | null): SiteSettingRead['regulation'] {
    if (!file) return null

    return {
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      status: file.status,
      partSize: file.partSize,
      uploadId: file.uploadId,
      createdAt: file.createdAt?.toISO() ?? null,
      updatedAt: file.updatedAt?.toISO() ?? null,
      deletedAt: file.deletedAt?.toISO() ?? null,
    }
  }

  private dateOrNull(date: Date | null): DateTime | null {
    if (!date) return null

    return DateTime.fromJSDate(date)
  }
}
