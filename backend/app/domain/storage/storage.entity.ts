import { UPLOAD_STATUS, left, right, type Either, type UploadStatus } from '@interclasse/shared'

import type { StorageError } from './storage.errors.ts'

/**
 * The signatures (magic bytes) of each accepted type: the `Content-Type` and the
 * extension are the client's declaration, and the content is what proves it
 * (_standards/backend.md §5.4). Each alternative is a list of byte sequences
 * at a position, and all of the list must match; the type matches
 * when some alternative matches.
 */
type Signature = { readonly offset: number; readonly bytes: ReadonlyArray<number> }

const TEXT = new TextEncoder()

const SIGNATURES: Readonly<Record<string, ReadonlyArray<ReadonlyArray<Signature>>>> = {
  'image/jpeg': [[{ offset: 0, bytes: [0xff, 0xd8, 0xff] }]],
  'image/png': [[{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }]],
  'image/gif': [
    [{ offset: 0, bytes: Array.from(TEXT.encode('GIF87a')) }],
    [{ offset: 0, bytes: Array.from(TEXT.encode('GIF89a')) }],
  ],
  'image/webp': [
    [
      { offset: 0, bytes: Array.from(TEXT.encode('RIFF')) },
      { offset: 8, bytes: Array.from(TEXT.encode('WEBP')) },
    ],
  ],
  'application/pdf': [[{ offset: 0, bytes: Array.from(TEXT.encode('%PDF-')) }]],
  'audio/mpeg': [
    [{ offset: 0, bytes: Array.from(TEXT.encode('ID3')) }],
    [{ offset: 0, bytes: [0xff, 0xfb] }],
    [{ offset: 0, bytes: [0xff, 0xf3] }],
    [{ offset: 0, bytes: [0xff, 0xf2] }],
  ],
  'audio/mp4': [[{ offset: 4, bytes: Array.from(TEXT.encode('ftyp')) }]],
  'audio/ogg': [[{ offset: 0, bytes: Array.from(TEXT.encode('OggS')) }]],
  'audio/wav': [
    [
      { offset: 0, bytes: Array.from(TEXT.encode('RIFF')) },
      { offset: 8, bytes: Array.from(TEXT.encode('WAVE')) },
    ],
  ],
}

export type StorageProps = {
  readonly id: string
  readonly filename: string
  readonly originalName: string
  readonly mimetype: string
  /** The size the client declared when opening the upload. */
  readonly size: number
  readonly path: string
  status: UploadStatus
  uploadId: string | null
  readonly partSize: number | null
  readonly createdAt: Date | null
  updatedAt: Date | null
  readonly deletedAt: Date | null
}

/**
 * The file in the bucket: born `PENDING`, and only becomes `UPLOADED` when what
 * went up has the size the client declared (`_standards/domain.md` §1). Only
 * `UPLOADED` can be attached to anything.
 */
export class Storage {
  private constructor(private readonly props: StorageProps) {}

  /**
   * Birth: the record of an upload that is about to start. The id and the clock
   * come from outside; so does the object key, because the bucket is what draws it.
   */
  static open(input: {
    readonly id: string
    readonly key: string
    readonly originalName: string
    readonly mimetype: string
    readonly size: number
    readonly uploadId: string | null
    readonly partSize: number
    readonly now: Date
  }): Storage {
    return new Storage({
      id: input.id,
      filename: input.key,
      originalName: input.originalName,
      mimetype: input.mimetype,
      size: input.size,
      path: input.key,
      status: UPLOAD_STATUS.PENDING,
      uploadId: input.uploadId,
      partSize: input.partSize,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
    })
  }

  /** Rehydration by the repository: the data passed through the rules when it was saved. */
  static restore(props: StorageProps): Storage {
    return new Storage({ ...props })
  }

  /**
   * Confirms the upload against what the bucket actually received. Calling again
   * on an already confirmed file returns the same file: a client that lost the
   * response resends the confirmation.
   */
  complete(
    received: { readonly contentLength: number; readonly head: Uint8Array },
    now: Date,
  ): Either<StorageError, Storage> {
    if (this.isUploaded()) return right(this)

    if (received.contentLength !== this.props.size)
      return left({
        code: 'STORAGE_SIZE_MISMATCH',
        declared: this.props.size,
        received: received.contentLength,
      })

    if (!this.matchesSignature(received.head))
      return left({ code: 'STORAGE_CONTENT_MISMATCH', mimetype: this.props.mimetype })

    this.props.status = UPLOAD_STATUS.UPLOADED
    // The upload is over: keeping the identifier would only keep alive a pointer
    // to a conversation the bucket has already closed.
    this.props.uploadId = null
    this.props.updatedAt = now

    return right(this)
  }

  /**
   * Whether the file can go. `PENDING` is an upload in progress and always can: it
   * cannot be referenced. `UPLOADED` in use, no: deleting would empty
   * whatever references it with no error at all, because the keys are `SET NULL`.
   */
  remove(usedBy: ReadonlyArray<string>): Either<StorageError, Storage> {
    if (this.isPending()) return right(this)
    if (usedBy.length > 0) return left({ code: 'STORAGE_IN_USE', usedBy })

    return right(this)
  }

  /**
   * The start of the object matches the signature of the declared type. A type without
   * a known signature does not confirm: the allowlist and the table go together.
   */
  private matchesSignature(head: Uint8Array): boolean {
    const alternatives = SIGNATURES[this.props.mimetype] ?? []

    return alternatives.some((rules) =>
      rules.every((rule) => rule.bytes.every((byte, index) => head[rule.offset + index] === byte)),
    )
  }

  isPending(): boolean {
    return this.props.status === UPLOAD_STATUS.PENDING
  }

  isUploaded(): boolean {
    return this.props.status === UPLOAD_STATUS.UPLOADED
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<StorageProps> {
    return { ...this.props }
  }
}
