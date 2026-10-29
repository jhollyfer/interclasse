import { PHOTO_STATUS, left, right, type Either, type PhotoStatus } from '@interclasse/shared'

import type { PhotoError } from './photo.errors.ts'

/**
 * Quem envia. O estado em que a foto nasce é decisão de quem a manda, não do
 * papel da conta: o conselheiro propõe, a organização publica.
 */
export const PHOTO_SENDER = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  ADVISOR: 'ADVISOR',
} as const

export type PhotoSender = (typeof PHOTO_SENDER)[keyof typeof PHOTO_SENDER]

/** O estado de nascimento de cada remetente. */
const BIRTH_STATUS = {
  [PHOTO_SENDER.ADMINISTRATOR]: PHOTO_STATUS.APPROVED,
  [PHOTO_SENDER.ADVISOR]: PHOTO_STATUS.PENDING,
} satisfies Record<PhotoSender, PhotoStatus>

export type PhotoProps = {
  readonly id: string
  readonly storageId: string
  readonly authorId: string | null
  caption: string | null
  status: PhotoStatus
  reviewedById: string | null
  reviewedAt: Date | null
  readonly createdAt: Date
  updatedAt: Date | null
}

type Review = {
  readonly status: PhotoStatus
  readonly reviewerId: string
  readonly now: Date
}

/**
 * Uma foto do carrossel do site. A do conselheiro nasce `PENDING`, a da
 * organização `APPROVED`; só imagem entra, e a decisão se refaz
 * (`_standards/domain.md` §1).
 */
export class Photo {
  private constructor(private readonly props: PhotoProps) {}

  /** Nascimento. O id e o relógio chegam de fora: o domínio não faz I/O. */
  static create(input: {
    readonly id: string
    readonly storage: { readonly id: string; readonly mimetype: string }
    readonly caption?: string | null
    readonly author: { readonly id: string }
    readonly sender: PhotoSender
    readonly now: Date
  }): Either<PhotoError, Photo> {
    // O carrossel é de fotos: PDF ou áudio no lugar viraria imagem quebrada.
    if (!input.storage.mimetype.startsWith('image/')) return left({ code: 'PHOTO_NOT_IMAGE' })

    const status = BIRTH_STATUS[input.sender]
    // A foto da organização é aprovada por quem a enviou, no ato.
    let reviewedById: string | null = null
    let reviewedAt: Date | null = null
    if (status === PHOTO_STATUS.APPROVED) {
      reviewedById = input.author.id
      reviewedAt = input.now
    }

    return right(
      new Photo({
        id: input.id,
        storageId: input.storage.id,
        authorId: input.author.id,
        caption: input.caption ?? null,
        status,
        reviewedById,
        reviewedAt,
        createdAt: input.now,
        // Nasce com a edição carimbada, como a linha do banco nasce.
        updatedAt: input.now,
      }),
    )
  }

  /** Reidratação pelo repository: o dado passou pelas invariantes ao ser gravado. */
  static restore(props: PhotoProps): Photo {
    return new Photo({ ...props })
  }

  /**
   * Aprova ou recusa. Pode ser refeita a qualquer hora: foto recusada por
   * engano é aprovada de novo, e a aprovada sai do ar sem ser apagada.
   */
  review(decision: Review): void {
    this.props.status = decision.status
    this.props.reviewedById = decision.reviewerId
    this.props.reviewedAt = decision.now
    this.props.updatedAt = decision.now
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<PhotoProps> {
    return { ...this.props }
  }
}
