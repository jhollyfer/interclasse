import { randomUUID } from 'node:crypto'

import {
  SiteSettingRepository,
  type PublicSiteSettingRead,
  type SiteSettingRead,
} from './site-setting.repository.ts'

import {
  SiteSetting,
  type RegulationFile,
  type SiteSettingProps,
} from '#domain/site-setting/site-setting.entity'

type RegulationRow = NonNullable<SiteSettingRead['regulation']>

/**
 * The second real implementation, for the use case unit test
 * (`_standards/domain.md` §5.3). It keeps copies: the test does not change the "database"
 * by reference.
 */
export class SiteSettingMemoryRepository extends SiteSettingRepository {
  private row: SiteSettingProps | null = null
  /** The uploaded files, by id: what the test arranges in place of the `storages` table. */
  private readonly files = new Map<string, RegulationRow>()

  /** Test arrangement: an uploaded, non-archived file. */
  withFile(file: RegulationRow): this {
    this.files.set(file.id, file)
    return this
  }

  async current(): Promise<SiteSetting> {
    if (!this.row) this.row = SiteSetting.create({ id: randomUUID(), now: new Date() }).snapshot()

    return SiteSetting.restore(structuredClone(this.row))
  }

  async findRegulationFile(id: string): Promise<RegulationFile | null> {
    const file = this.files.get(id)
    if (!file) return null

    return { mimetype: file.mimetype }
  }

  async save(setting: SiteSetting): Promise<void> {
    this.row = structuredClone(setting.snapshot())
  }

  async show(): Promise<SiteSettingRead> {
    const row = await this.snapshot()

    return {
      id: row.id,
      about: row.about,
      organizer: row.organizer,
      firstEditionYear: row.firstEditionYear,
      edition: row.edition,
      schoolInstagram: row.schoolInstagram,
      developerInstagram: row.developerInstagram,
      regulationId: row.regulationId,
      regulation: this.regulationOf(row.regulationId),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt?.toISOString() ?? null,
    }
  }

  async showPublic(): Promise<PublicSiteSettingRead> {
    const row = await this.snapshot()
    const regulation = this.regulationOf(row.regulationId)

    return {
      about: row.about,
      organizer: row.organizer,
      firstEditionYear: row.firstEditionYear,
      edition: row.edition,
      schoolInstagram: row.schoolInstagram,
      developerInstagram: row.developerInstagram,
      regulation: regulation && {
        path: regulation.path,
        originalName: regulation.originalName,
        size: regulation.size,
      },
    }
  }

  private async snapshot(): Promise<SiteSettingProps> {
    const setting = await this.current()

    return setting.snapshot()
  }

  private regulationOf(id: string | null): RegulationRow | null {
    if (!id) return null

    return this.files.get(id) ?? null
  }
}
