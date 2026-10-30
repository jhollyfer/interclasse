import type {
  AdministratorSiteRegulationResponse,
  AdministratorSiteShowResponse,
  StorefrontSiteShowResponse,
} from '@interclasse/shared'

import type { RegulationFile, SiteSetting } from '#domain/site-setting/site-setting.entity'

/**
 * A configuração na forma da resposta do painel, com o regulamento sem a `url`:
 * assinar é do use-case, pelo contrato do bucket (`_standards/architecture.md` §2).
 */
export type SiteSettingRead = Omit<AdministratorSiteShowResponse, 'regulation'> & {
  readonly regulation: Omit<AdministratorSiteRegulationResponse, 'url'> | null
}

/** O recorte do site anônimo, com o `path` do regulamento no lugar da `url`. */
export type PublicSiteSettingRead = Omit<StorefrontSiteShowResponse, 'regulation'> & {
  readonly regulation: {
    readonly path: string
    readonly originalName: string
    readonly size: number
  } | null
}

/**
 * A persistência da configuração do site, por intenção (`_standards/domain.md`
 * §5.1). O escritor único da tabela `site_settings`; lê `storages` só para
 * responder o que a regra do regulamento pergunta e para montar a resposta.
 */
export abstract class SiteSettingRepository {
  /** A linha única. Nasce vazia na primeira leitura. */
  abstract current(): Promise<SiteSetting>
  /** O arquivo já enviado e não arquivado, ou `null`: candidato a regulamento. */
  abstract findRegulationFile(id: string): Promise<RegulationFile | null>
  abstract save(setting: SiteSetting): Promise<void>
  /** Leitura leve: a resposta do painel, com o regulamento, direto da query. */
  abstract show(): Promise<SiteSettingRead>
  /** Leitura leve: o recorte do site anônimo. */
  abstract showPublic(): Promise<PublicSiteSettingRead>
}
