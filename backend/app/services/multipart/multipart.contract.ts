/**
 * The multipart upload contract (_standards/solid.md §2): external I/O, S3.
 *
 * `abstract class` and not `type`: it serves as a container token and as a type at the same
 * time. The concrete one is `MultipartService`, bound in `providers/storage.provider.ts`;
 * the use case depends only on this, and a test swaps the vendor with `container.swap`.
 */

/** A part the client is still going to send, and the address to send it to. */
export type PresignedPart = {
  readonly partNumber: number
  readonly url: string
}

/** A part to sign: the number and the exact size, which the signature pins. */
export type PartToSign = {
  readonly partNumber: number
  readonly size: number
}

/** A part the bucket has already received. The `etag` is what `complete` requires. */
export type UploadedPart = {
  readonly partNumber: number
  readonly size: number
  readonly etag: string
}

/**
 * The size of each part, in bytes.
 *
 * 10 MB and not 5 MB, which is the S3 minimum: at double the size there are half the
 * parts, half the connections and half the URLs to sign. The 10,000-part ceiling per
 * upload becomes a 100 GB ceiling per file, comfortable for the 1 GiB
 * `UPLOAD_MAX_SIZE`.
 */
export const PART_SIZE = 10 * 1024 * 1024

/**
 * How many URLs come out in a single response.
 *
 * A large file has too many parts to sign all at once: each signed URL
 * is about 500 bytes, and a thousand of them would be half a megabyte of JSON to
 * deliver before the first byte of the file goes up. The client asks for the next
 * batch at `GET /storages/:id/parts`, which is the same endpoint as resuming.
 */
export const PRESIGNED_BATCH = 100

export abstract class MultipartContract {
  abstract initiate(key: string, contentType: string): Promise<string>
  abstract signParts(
    key: string,
    uploadId: string,
    parts: ReadonlyArray<PartToSign>,
    expiresIn?: number,
  ): Promise<Array<PresignedPart>>
  abstract signSingle(
    key: string,
    contentType: string,
    size: number,
    expiresIn?: number,
  ): Promise<string>
  abstract listParts(key: string, uploadId: string): Promise<Array<UploadedPart>>
  abstract complete(
    key: string,
    uploadId: string,
    parts: ReadonlyArray<{ readonly partNumber: number; readonly etag: string }>,
  ): Promise<void>
  abstract abort(key: string, uploadId: string): Promise<void>
}
