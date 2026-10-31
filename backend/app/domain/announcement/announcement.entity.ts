export type AnnouncementProps = {
  readonly id: string
  title: string
  body: string
  pinned: boolean
  readonly createdAt: Date
  updatedAt: Date | null
}

type AnnouncementChanges = {
  readonly title?: string
  readonly body?: string
  readonly pinned?: boolean
}

/**
 * The games announcement: schedule change, venue, rule. A thin entity, on
 * purpose: non-empty text and sizes belong to the validator, and the announcement has
 * no other rule (`_standards/domain.md` §1, "proportional intensity").
 */
export class Announcement {
  private constructor(private readonly props: AnnouncementProps) {}

  /** Birth. The id and the clock come from outside; without `pinned`, it is born unpinned. */
  static create(input: {
    readonly id: string
    readonly title: string
    readonly body: string
    readonly pinned?: boolean
    readonly now: Date
  }): Announcement {
    return new Announcement({
      id: input.id,
      title: input.title,
      body: input.body,
      pinned: input.pinned ?? false,
      createdAt: input.now,
      // Born with the edit stamped, the way the database row is born.
      updatedAt: input.now,
    })
  }

  /** Rehydration by the repository. */
  static restore(props: AnnouncementProps): Announcement {
    return new Announcement({ ...props })
  }

  /** An absent field means "leave alone". */
  edit(changes: AnnouncementChanges, now: Date): void {
    this.props.title = changes.title ?? this.props.title
    this.props.body = changes.body ?? this.props.body
    this.props.pinned = changes.pinned ?? this.props.pinned
    this.props.updatedAt = now
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<AnnouncementProps> {
    return { ...this.props }
  }
}
