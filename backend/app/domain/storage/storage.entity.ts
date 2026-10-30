import { UPLOAD_STATUS, left, right, type Either, type UploadStatus } from '@interclasse/shared'

import type { StorageError } from './storage.errors.ts'

/**
 * Quantos bytes do início do objeto bastam para conferir o tipo: a maior
 * assinatura (WebP e WAV, `RIFF....WEBP`) acaba no byte 12.
 */
export const SIGNATURE_BYTES = 12

/**
 * As assinaturas (magic bytes) de cada tipo aceito: o `Content-Type` e a
 * extensão são declaração do cliente, e o conteúdo é o que prova
 * (_standards/backend.md §5.4). Cada alternativa é uma lista de sequências de
 * bytes em uma posição, e todas da lista precisam conferir; o tipo confere
 * quando alguma alternativa confere.
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
  /** O tamanho que o cliente declarou ao abrir o upload. */
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
 * O arquivo no bucket: nasce `PENDING`, e só passa a `UPLOADED` quando o que
 * subiu tem o tamanho que o cliente declarou (`_standards/domain.md` §1). Só
 * `UPLOADED` pode ser anexado a alguma coisa.
 */
export class Storage {
  private constructor(private readonly props: StorageProps) {}

  /**
   * Nascimento: o registro de um upload que vai começar. O id e o relógio
   * chegam de fora; a chave do objeto também, porque quem a sorteia é o bucket.
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

  /** Reidratação pelo repository: o dado passou pelas regras ao ser gravado. */
  static restore(props: StorageProps): Storage {
    return new Storage({ ...props })
  }

  /**
   * Confirma o upload contra o que o bucket de fato recebeu. Chamar de novo
   * num arquivo já confirmado devolve o mesmo arquivo: o cliente que perdeu a
   * resposta reenvia a confirmação.
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
    // O upload acabou: guardar o identificador só manteria vivo um ponteiro
    // para uma conversa que o bucket já encerrou.
    this.props.uploadId = null
    this.props.updatedAt = now

    return right(this)
  }

  /**
   * Se o arquivo pode sair. `PENDING` é upload em andamento e sempre pode: não
   * tem como estar referenciado. `UPLOADED` em uso, não: apagar esvaziaria o
   * que o referencia sem erro nenhum, porque as chaves são `SET NULL`.
   */
  remove(usedBy: ReadonlyArray<string>): Either<StorageError, Storage> {
    if (this.isPending()) return right(this)
    if (usedBy.length > 0) return left({ code: 'STORAGE_IN_USE', usedBy })

    return right(this)
  }

  /**
   * O início do objeto bate com a assinatura do tipo declarado. Tipo sem
   * assinatura conhecida não confirma: a allowlist e a tabela andam juntas.
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
