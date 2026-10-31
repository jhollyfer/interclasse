import type { StorageMimetype } from '@interclasse/shared'

/** What the bucket knows about an object: what the upload confirmation checks. */
export type StorageMetadata = {
  readonly contentLength: number
  readonly etag?: string
}

/** The file, only by what the bucket needs to sign the download URL. */
export type StorageDownload = {
  readonly path: string
  readonly mimetype: string
  readonly originalName: string
}

/**
 * The bucket contract (_standards/solid.md §2): external I/O.
 *
 * `abstract class` and not `type`: it serves as a container token and as a type at the same
 * time. The concrete one is `StorageService`, bound in `providers/storage.provider.ts`;
 * use cases depend only on this, and the unit test passes the `StorageFake`.
 *
 * It only talks about objects, by `path`. The `storages` row belongs to the `StorageRepository`.
 */
export abstract class StorageContract {
  /** The key under which the object will live in the bucket. */
  abstract key(mimetype: StorageMimetype): string
  /** What the bucket knows about the object: size and `ETag`. */
  abstract metadata(path: string): Promise<StorageMetadata>
  /**
   * The first bytes of the object (`STORAGE_SIGNATURE_BYTES`), to check the type by
   * content and not by what the client declared.
   */
  abstract head(path: string): Promise<Uint8Array>
  /** Deletes the binary from the bucket. */
  abstract discard(path: string): Promise<void>
  /** The signed read URL, derived from `path` on every read of the record. */
  abstract signedUrl(path: string): Promise<string>
  /** A temporary URL that delivers the file with the original name. */
  abstract signedDownload(file: StorageDownload): Promise<string>
  /** The `Content-Disposition` header of a download, with the original name. */
  abstract contentDisposition(originalName: string): string

  /**
   * The single point of read signing: the file record with the `url` beside
   * the `path`. The repository returns the read without `url` (`_standards/architecture.md`
   * §2: no service inside it) and the use case signs through here, on every read.
   */
  async withUrl<TFile extends { readonly path: string }>(
    file: TFile,
  ): Promise<TFile & { readonly url: string }> {
    return { ...file, url: await this.signedUrl(file.path) }
  }

  /** `withUrl` of the optional attachment (avatar): without a file, it stays `null`. */
  async withOptionalUrl<TFile extends { readonly path: string }>(
    file: TFile | null,
  ): Promise<(TFile & { readonly url: string }) | null> {
    if (!file) return null

    return this.withUrl(file)
  }
}
