import { PHOTO_STATUS, left, right, type Either, type PhotoStatus } from '@interclasse/shared'

import type { PhotoError } from './photo.errors.ts'

/**
 * Who uploads. The state in which the photo is born is the decision of who sends it, not of the
 * account role: the advisor proposes, the organization publishes.
 */
export const PHOTO_SENDER = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  ADVISOR: 'ADVISOR',
} as const

export type PhotoSender = (typeof PHOTO_SENDER)[keyof typeof PHOTO_SENDER]

/** The birth state of each sender. */
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
 * A photo of the site carousel. The advisor's is born `PENDING`, the
 * organization's `APPROVED`; only images enter, and the decision can be redone
 * (`_standards/domain.md` §1).
 */
export class Photo {
  private constructor(private readonly props: PhotoProps) {}

  /** Birth. The id and the clock come from outside: the domain does no I/O. */
  static create(input: {
    readonly id: string
    readonly storage: { readonly id: string; readonly mimetype: string }
    readonly caption?: string | null
    readonly author: { readonly id: string }
    readonly sender: PhotoSender
    readonly now: Date
  }): Either<PhotoError, Photo> {
    // The carousel is for photos: a PDF or audio in its place would become a broken image.
    if (!input.storage.mimetype.startsWith('image/')) return left({ code: 'PHOTO_NOT_IMAGE' })

    const status = BIRTH_STATUS[input.sender]
    // The organization's photo is approved by whoever uploaded it, on the spot.
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
        // Born with the edit stamped, the way the database row is born.
        updatedAt: input.now,
      }),
    )
  }

  /** Rehydration by the repository: the data passed through the invariants when it was saved. */
  static restore(props: PhotoProps): Photo {
    return new Photo({ ...props })
  }

  /**
   * Approves or rejects. It can be redone at any time: a photo rejected by
   * mistake is approved again, and the approved one leaves the air without being deleted.
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
