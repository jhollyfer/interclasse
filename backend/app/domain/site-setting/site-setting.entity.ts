import { left, right, type Either } from '@interclasse/shared'

import type { SiteSettingError } from './site-setting.errors.ts'

/** The regulation is for downloading and printing: PDF only. */
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

/** Absent means "leave alone"; `null` erases. */
type SiteSettingChanges = {
  readonly about?: string | null
  readonly organizer?: string | null
  readonly firstEditionYear?: number | null
  readonly edition?: number | null
  readonly schoolInstagram?: string | null
  readonly developerInstagram?: string | null
  readonly regulationId?: string | null
}

/** What the entity needs to know about the file to accept it as the regulation. */
export type RegulationFile = {
  readonly mimetype: string
}

/**
 * The games "About" and the regulation: a single row (`_standards/domain.md`
 * §1). The rule it holds is the regulation's - an already uploaded file, and a PDF.
 */
export class SiteSetting {
  private constructor(private readonly props: SiteSettingProps) {}

  /** Birth: everything empty. The site shows what the organization fills in, nothing invented. */
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

  /** Rehydration by the repository. */
  static restore(props: SiteSettingProps): SiteSetting {
    return new SiteSetting({ ...props })
  }

  /** Whether these changes swap the regulation for another file: only then is it worth checking it. */
  replacesRegulation(regulationId: string | null | undefined): regulationId is string {
    return Boolean(regulationId)
  }

  /**
   * Writes what came. The `regulation` is the file the repository found for the
   * requested `regulationId` (or `null`, if it found none): it is only checked when the
   * changes swap the regulation.
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
