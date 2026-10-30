import { UPLOAD_STATUS, left, right, type Either, type UploadStatus } from '@interclasse/shared'

import type { StorageError } from './storage.errors.ts'

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
  complete(received: { readonly contentLength: number }, now: Date): Either<StorageError, Storage> {
    if (this.isUploaded()) return right(this)

    if (received.contentLength !== this.props.size)
      return left({
        code: 'STORAGE_SIZE_MISMATCH',
        declared: this.props.size,
        received: received.contentLength,
      })

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
