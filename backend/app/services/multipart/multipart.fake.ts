import {
  MultipartContract,
  type PartToSign,
  type PresignedPart,
  type UploadedPart,
} from '#services/multipart/multipart.contract'

/**
 * O S3 multipart em memória, para o teste unitário. Honra o contrato do
 * `MultipartService`: guarda as partes que o teste "enviou" e registra os
 * uploads abertos, completados e abortados.
 */
export class MultipartFake extends MultipartContract {
  readonly initiated: string[] = []
  readonly completed: string[] = []
  readonly aborted: string[] = []
  private readonly uploaded = new Map<string, UploadedPart[]>()

  /** Arranjo do teste: as partes que o bucket já recebeu deste upload. */
  withUploaded(uploadId: string, parts: UploadedPart[]): this {
    this.uploaded.set(uploadId, parts)
    return this
  }

  async initiate(key: string): Promise<string> {
    this.initiated.push(key)

    return `upload-${key}`
  }

  async signParts(
    key: string,
    _uploadId: string,
    parts: ReadonlyArray<PartToSign>,
  ): Promise<Array<PresignedPart>> {
    return parts.map(({ partNumber }) => ({
      partNumber,
      url: `https://bucket.test/${key}?part=${partNumber}`,
    }))
  }

  async signSingle(key: string): Promise<string> {
    return `https://bucket.test/${key}?single`
  }

  async listParts(_key: string, uploadId: string): Promise<Array<UploadedPart>> {
    return this.uploaded.get(uploadId) ?? []
  }

  async complete(key: string): Promise<void> {
    this.completed.push(key)
  }

  async abort(key: string): Promise<void> {
    this.aborted.push(key)
  }
}
