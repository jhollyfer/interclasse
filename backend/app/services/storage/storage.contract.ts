import type { StorageMimetype } from '@interclasse/shared'

/** O que o bucket sabe de um objeto: o que a confirmação do upload confere. */
export type StorageMetadata = {
  readonly contentLength: number
  readonly etag?: string
}

/** O arquivo, só pelo que o bucket precisa para assinar a URL de download. */
export type StorageDownload = {
  readonly path: string
  readonly mimetype: string
  readonly originalName: string
}

/**
 * O contrato do bucket (_standards/solid.md §2): I/O externo.
 *
 * `abstract class` e não `type`: serve de token no container e de tipo ao mesmo
 * tempo. O concreto é `StorageService`, ligado em `providers/storage.provider.ts`;
 * use-cases dependem só daqui, e o teste unitário passa o `StorageFake`.
 *
 * Só fala de objeto, pelo `path`. A linha em `storages` é do `StorageRepository`.
 */
export abstract class StorageContract {
  /** A chave sob a qual o objeto vai viver no bucket. */
  abstract key(mimetype: StorageMimetype): string
  /** O que o bucket sabe sobre o objeto: tamanho e `ETag`. */
  abstract metadata(path: string): Promise<StorageMetadata>
  /**
   * Os primeiros bytes do objeto (`STORAGE_SIGNATURE_BYTES`), para conferir o tipo pelo
   * conteúdo e não pelo que o cliente declarou.
   */
  abstract head(path: string): Promise<Uint8Array>
  /** Apaga o binário do bucket. */
  abstract discard(path: string): Promise<void>
  /** A URL assinada de leitura, derivada de `path` a cada leitura do registro. */
  abstract signedUrl(path: string): Promise<string>
  /** Uma URL temporária que entrega o arquivo com o nome original. */
  abstract signedDownload(file: StorageDownload): Promise<string>
  /** O header `Content-Disposition` de um download, com o nome original. */
  abstract contentDisposition(originalName: string): string

  /**
   * O ponto único da assinatura de leitura: o registro do arquivo com a `url` ao lado
   * do `path`. O repository devolve a leitura sem `url` (`_standards/architecture.md`
   * §2: nenhum service dentro dele) e o use-case assina por aqui, a cada leitura.
   */
  async withUrl<TFile extends { readonly path: string }>(
    file: TFile,
  ): Promise<TFile & { readonly url: string }> {
    return { ...file, url: await this.signedUrl(file.path) }
  }

  /** `withUrl` do anexo opcional (avatar): sem arquivo, segue `null`. */
  async withOptionalUrl<TFile extends { readonly path: string }>(
    file: TFile | null,
  ): Promise<(TFile & { readonly url: string }) | null> {
    if (!file) return null

    return this.withUrl(file)
  }
}
