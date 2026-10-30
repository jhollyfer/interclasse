import {
  StorageContract,
  type StorageDownload,
  type StorageMetadata,
} from '#services/storage/storage.contract'

const PNG_HEAD = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * O bucket em memória, para o teste unitário. Honra o mesmo contrato do
 * `StorageService`: o teste arranja o que o bucket "recebeu" com `put` e lê o
 * que foi apagado em `discarded`.
 */
export class StorageFake extends StorageContract {
  readonly discarded: string[] = []
  private readonly objects = new Map<string, StorageMetadata>()
  private readonly heads = new Map<string, Uint8Array>()
  private keys = 0

  /**
   * Arranjo do teste: o objeto que o cliente subiu. Sem `head`, o conteúdo é um
   * PNG, o tipo dos arquivos de teste.
   */
  put(path: string, metadata: StorageMetadata, head: Uint8Array = PNG_HEAD): this {
    this.objects.set(path, metadata)
    this.heads.set(path, head)
    return this
  }

  async head(path: string): Promise<Uint8Array> {
    const head = this.heads.get(path)
    if (!head) throw new Error(`objeto ausente no bucket: ${path}`)

    return head
  }

  key(): string {
    this.keys += 1

    return `fake-${this.keys}.bin`
  }

  async metadata(path: string): Promise<StorageMetadata> {
    const metadata = this.objects.get(path)
    if (!metadata) throw new Error(`objeto ausente no bucket: ${path}`)

    return metadata
  }

  async discard(path: string): Promise<void> {
    this.discarded.push(path)
    this.objects.delete(path)
  }

  async signedUrl(path: string): Promise<string> {
    return `https://bucket.test/${path}?signed`
  }

  async signedDownload(file: StorageDownload): Promise<string> {
    return `https://bucket.test/${file.path}?download=${encodeURIComponent(file.originalName)}`
  }

  contentDisposition(originalName: string): string {
    return `attachment; filename="${originalName}"`
  }
}
