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
 * O aviso dos jogos: troca de horário, local, regra. Entidade fina, de
 * propósito: o texto não vazio e os tamanhos são do validator, e o aviso não
 * tem outra regra (`_standards/domain.md` §1, "intensidade proporcional").
 */
export class Announcement {
  private constructor(private readonly props: AnnouncementProps) {}

  /** Nascimento. O id e o relógio chegam de fora; sem `pinned`, nasce sem destaque. */
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
      // Nasce com a edição carimbada, como a linha do banco nasce.
      updatedAt: input.now,
    })
  }

  /** Reidratação pelo repository. */
  static restore(props: AnnouncementProps): Announcement {
    return new Announcement({ ...props })
  }

  /** Campo ausente é "não mexer". */
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
