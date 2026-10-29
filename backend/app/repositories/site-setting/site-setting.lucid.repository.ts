import { randomUUID } from 'node:crypto'

import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import {
  UPLOAD_STATUS,
  type AdministratorSiteRegulationResponse,
  type AdministratorSiteShowResponse,
  type StorefrontSiteShowResponse,
} from '@interclasse/shared'

import { SiteSettingRepository } from './site-setting.repository.ts'

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
    const row = await SiteSettingModel.query({ client: this.transaction.client() }).first()
    if (row) return this.toEntity(row)

    const born = SiteSetting.create({ id: randomUUID(), now: new Date() })
    await this.save(born)

    return born
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

  async show(): Promise<AdministratorSiteShowResponse> {
    const row = await this.rowWithRegulation()

    return {
      id: row.id,
      about: row.about,
      organizer: row.organizer,
      firstEditionYear: row.firstEditionYear,
      edition: row.edition,
      schoolInstagram: row.schoolInstagram,
      developerInstagram: row.developerInstagram,
      regulationId: row.regulationId,
      regulation: this.toRegulationResponse(row.regulation),
      createdAt: row.createdAt.toISO() ?? '',
      updatedAt: row.updatedAt?.toISO() ?? null,
    }
  }

  async showPublic(): Promise<StorefrontSiteShowResponse> {
    const row = await this.rowWithRegulation()
    const { regulation } = row

    return {
      about: row.about,
      organizer: row.organizer,
      firstEditionYear: row.firstEditionYear,
      edition: row.edition,
      schoolInstagram: row.schoolInstagram,
      developerInstagram: row.developerInstagram,
      regulation: regulation && {
        url: regulation.url ?? '',
        originalName: regulation.originalName,
        size: regulation.size,
      },
    }
  }

  /** A linha única com o regulamento carregado; cria a linha se for a primeira leitura. */
  private async rowWithRegulation(): Promise<SiteSettingModel> {
    const { id } = await this.current().then((setting) => setting.snapshot())

    return SiteSettingModel.query({ client: this.transaction.client() })
      .where('id', id)
      .preload('regulation')
      .firstOrFail()
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

  private toRegulationResponse(
    file: StorageModel | null,
  ): AdministratorSiteRegulationResponse | null {
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
      url: file.url,
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
