import { left, right, type Either } from '@interclasse/shared'

import type { SiteSettingError } from './site-setting.errors.ts'

/** O regulamento é para baixar e imprimir: só PDF. */
export const REGULATION_MIMETYPE = 'application/pdf'

export type SiteSettingProps = {
  readonly id: string
  about: string | null
  organizer: string | null
  firstEditionYear: number | null
  edition: number | null
  schoolInstagram: string | null
  developerInstagram: string | null
  regulationId: string | null
  readonly createdAt: Date
  updatedAt: Date | null
}

/** Ausente é "não mexer"; `null` apaga. */
type SiteSettingChanges = {
  readonly about?: string | null
  readonly organizer?: string | null
  readonly firstEditionYear?: number | null
  readonly edition?: number | null
  readonly schoolInstagram?: string | null
  readonly developerInstagram?: string | null
  readonly regulationId?: string | null
}

/** O que a entidade precisa saber do arquivo para aceitá-lo como regulamento. */
export type RegulationFile = {
  readonly mimetype: string
}

/**
 * O "Sobre" dos jogos e o regulamento: uma linha só (`_standards/domain.md`
 * §1). A regra que guarda é a do regulamento - arquivo já enviado e em PDF.
 */
export class SiteSetting {
  private constructor(private readonly props: SiteSettingProps) {}

  /** Nascimento: tudo vazio. O site mostra o que a organização preencher, nada inventado. */
  static create(input: { readonly id: string; readonly now: Date }): SiteSetting {
    return new SiteSetting({
      id: input.id,
      about: null,
      organizer: null,
      firstEditionYear: null,
      edition: null,
      schoolInstagram: null,
      developerInstagram: null,
      regulationId: null,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  /** Reidratação pelo repository. */
  static restore(props: SiteSettingProps): SiteSetting {
    return new SiteSetting({ ...props })
  }

  /** Se estas mudanças trocam o regulamento por outro arquivo: só aí vale conferi-lo. */
  replacesRegulation(regulationId: string | null | undefined): regulationId is string {
    return Boolean(regulationId)
  }

  /**
   * Grava o que veio. O `regulation` é o arquivo que o repository achou para o
   * `regulationId` pedido (ou `null`, se não achou): só é conferido quando as
   * mudanças trocam o regulamento.
   */
  update(
    changes: SiteSettingChanges,
    context: { readonly regulation: RegulationFile | null; readonly now: Date },
  ): Either<SiteSettingError, SiteSetting> {
    if (this.replacesRegulation(changes.regulationId)) {
      if (!context.regulation) return left({ code: 'STORAGE_NOT_FOUND' })
      if (context.regulation.mimetype !== REGULATION_MIMETYPE)
        return left({ code: 'REGULATION_NOT_PDF' })
    }

    const {
      about = this.props.about,
      organizer = this.props.organizer,
      firstEditionYear = this.props.firstEditionYear,
      edition = this.props.edition,
      schoolInstagram = this.props.schoolInstagram,
      developerInstagram = this.props.developerInstagram,
      regulationId = this.props.regulationId,
    } = changes

    this.props.about = about
    this.props.organizer = organizer
    this.props.firstEditionYear = firstEditionYear
    this.props.edition = edition
    this.props.schoolInstagram = schoolInstagram
    this.props.developerInstagram = developerInstagram
    this.props.regulationId = regulationId
    this.props.updatedAt = context.now

    return right(this)
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<SiteSettingProps> {
    return { ...this.props }
  }
}
