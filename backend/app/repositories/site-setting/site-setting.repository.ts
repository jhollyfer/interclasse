import type {
  AdministratorSiteRegulationResponse,
  AdministratorSiteShowResponse,
  StorefrontSiteShowResponse,
} from '@interclasse/shared'

import type { RegulationFile, SiteSetting } from '#domain/site-setting/site-setting.entity'

/**
 * The configuration in the panel response shape, with the regulation without the `url`:
 * signing belongs to the use case, through the bucket contract (`_standards/architecture.md` §2).
 */
export type SiteSettingRead = Omit<AdministratorSiteShowResponse, 'regulation'> & {
  readonly regulation: Omit<AdministratorSiteRegulationResponse, 'url'> | null
}

/** The anonymous site slice, with the regulation `path` in place of the `url`. */
export type PublicSiteSettingRead = Omit<StorefrontSiteShowResponse, 'regulation'> & {
  readonly regulation: {
    readonly path: string
    readonly originalName: string
    readonly size: number
  } | null
}

/**
 * The site configuration persistence, by intent (`_standards/domain.md`
 * §5.1). The single writer of the `site_settings` table; it reads `storages` only to
 * answer what the regulation rule asks and to build the response.
 */
export abstract class SiteSettingRepository {
  /** The single row. Born empty on the first read. */
  abstract current(): Promise<SiteSetting>
  /** The already uploaded, non-archived file, or `null`: a regulation candidate. */
  abstract findRegulationFile(id: string): Promise<RegulationFile | null>
  abstract save(setting: SiteSetting): Promise<void>
  /** Lightweight read: the panel response, with the regulation, straight from the query. */
  abstract show(): Promise<SiteSettingRead>
  /** Lightweight read: the anonymous site slice. */
  abstract showPublic(): Promise<PublicSiteSettingRead>
}
