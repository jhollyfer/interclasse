import type { Either } from '#core/either'
import type { StorageMimetype } from '#core/validator'
import type HTTPException from '#exceptions/http.exception'
import type Storage from '#models/storage'

/** O que o bucket sabe de um objeto: o que a confirmação do upload confere. */
export type StorageMetadata = {
  readonly contentLength: number
  readonly etag?: string
}

/**
 * O contrato de arquivo (_standards/solid.md §2): I/O externo, o bucket.
 *
 * `abstract class` e não `type`: serve de token no container e de tipo ao mesmo
 * tempo. O concreto é `StorageService`, ligado em `providers/storage.provider.ts`;
 * use-cases dependem só daqui, e um teste troca o fornecedor por `container.swap`.
 */
export abstract class StorageContract {
  /** A chave sob a qual o objeto vai viver no bucket. */
  abstract key(mimetype: StorageMimetype): string
  /** O que o bucket sabe sobre o objeto: tamanho e `ETag`. */
  abstract metadata(storage: Storage): Promise<StorageMetadata>
  /** Apaga só o binário, deixando a linha. */
  abstract discard(storage: Storage): Promise<void>
  /** Onde o arquivo está em uso, em rótulos legíveis; vazio quer dizer órfão. */
  abstract references(storageId: string): Promise<string[]>
  /** A URL assinada de leitura, derivada de `path` a cada leitura do registro. */
  abstract signedUrl(storage: Storage): Promise<string>
  /** Uma URL temporária que entrega o arquivo com o nome original. */
  abstract signedDownload(storage: Storage): Promise<string>
  /** O header `Content-Disposition` de um download, com o nome original. */
  abstract contentDisposition(originalName: string): string
  /** Apaga o binário e depois o registro, nesta ordem. */
  abstract remove(storage: Storage): Promise<void>
  /** Existência dos arquivos de um payload, antes de qualquer escrita. */
  abstract assertExist(
    field: string,
    storageIds: ReadonlyArray<string>,
  ): Promise<Either<HTTPException, string[]>>
}
