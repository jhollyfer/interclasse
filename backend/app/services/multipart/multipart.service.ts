import { inject } from '@adonisjs/core'
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { bucket } from '#config/drive'
import {
  MultipartContract,
  type PartToSign,
  type PresignedPart,
  type UploadedPart,
} from '#services/multipart/multipart.contract'

/**
 * How long a signed URL is valid, in seconds.
 *
 * One hour, and not the whole day: a leaked URL stays usable until it expires,
 * and the cost of expiring early is low because resuming already knows how to ask for a new URL
 * for the missing parts.
 */
const URL_EXPIRES_IN = 60 * 60

/**
 * The headers the signature pins. Without this the SDK presigner does not sign
 * `content-type` or `content-length`, and the bucket accepts any type and
 * any size on the URL (_standards/backend.md §5.4; _doc-lib/adonisjs.md#guides/basics/file-uploads,
 * https://docs.adonisjs.com/guides/basics/file-uploads). With it, a `PUT` with a type
 * or size different from the signed one gets 403 from the storage.
 */
const SIGNABLE_HEADERS = new Set(['content-type', 'content-length'])

/**
 * A multipart part has no type: `UploadPart` carries no `ContentType`, and the
 * browser's `Blob.slice` uploads without `Content-Type`. Signing `content-type` here
 * declares a header the request does not send, and a real S3 (MinIO, AWS)
 * refuses with "headers present in the request which were not signed". The part
 * pins only the size.
 */
const PART_SIGNABLE_HEADERS = new Set(['content-length'])

/**
 * The S3 multipart, which FlyDrive does not expose.
 *
 * FlyDrive covers the whole file - `put`, `get`, `delete`, `getUrl`,
 * `getSignedUrl` - and is what `StorageService` uses. What does not exist there is the
 * conversation in parts (`CreateMultipartUpload`, `UploadPart`, `ListParts`,
 * `CompleteMultipartUpload`, `AbortMultipartUpload`), and it is what makes an
 * upload resumable. That is why this service talks to the SDK directly, with the same
 * connection FlyDrive uses (`config/drive.ts`).
 *
 * Nothing here knows `storages`, `Either` or HTTP: it is the layer that translates
 * "I want to upload this in pieces" into the protocol. Whoever decides when to start,
 * confirm or abort is the use case.
 *
 * The client comes from the container (`providers/storage.provider.ts`), and not from a
 * `new` in here: it is what lets a test point at another bucket or
 * simulate a storage failure without touching the process environment.
 */
@inject()
export default class MultipartService extends MultipartContract {
  constructor(private readonly client: S3Client) {
    super()
  }

  /**
   * Opens a multipart upload and returns the `UploadId` that identifies the conversation.
   *
   * From here on the bucket keeps the received parts under that identifier,
   * and nothing shows at the final key until `complete`. It is what lets the client
   * vanish midway and come back later.
   */
  async initiate(key: string, contentType: string): Promise<string> {
    const response = await this.client.send(
      new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    )

    // S3 always returns `UploadId` on a successful `CreateMultipartUpload`; the
    // SDK type marks it optional because the response is shared with other
    // operations. Without it there is no upload to resume or to confirm.
    if (!response.UploadId) {
      throw new Error(`Storage did not return an UploadId for key ${key}`)
    }

    return response.UploadId
  }

  /**
   * The URLs to send the indicated parts, one per part.
   *
   * It receives **which** parts to sign, not how many, because resuming needs to
   * sign only what is missing. A new upload asks for parts `1, 2, 3, ...`; a
   * resumed one asks for the gap that remains. Each part carries its own size, pinned
   * in `Content-Length` in the signature.
   */
  async signParts(
    key: string,
    uploadId: string,
    parts: ReadonlyArray<PartToSign>,
    expiresIn: number = URL_EXPIRES_IN,
  ): Promise<Array<PresignedPart>> {
    return Promise.all(
      parts.map(async ({ partNumber, size }) => {
        const url = await getSignedUrl(
          this.client,
          new UploadPartCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
            ContentLength: size,
          }),
          { expiresIn, signableHeaders: PART_SIGNABLE_HEADERS },
        )

        return { partNumber, url }
      }),
    )
  }

  /**
   * The URL of a whole-file upload, without parts.
   *
   * It exists because multipart only pays off when there is more than one part: a 40 KB
   * avatar needs no `UploadId`, no collected `ETag` and no two-step
   * confirmation - it needs a `PUT`.
   */
  async signSingle(
    key: string,
    contentType: string,
    size: number,
    expiresIn: number = URL_EXPIRES_IN,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: size,
      }),
      { expiresIn, signableHeaders: SIGNABLE_HEADERS },
    )
  }

  /**
   * The parts the bucket has already received, in order.
   *
   * It is what answers "where do I continue from": the client compares with what it
   * intended to send and resends only the gap.
   *
   * It paginates on purpose. `ListParts` returns at most a thousand parts per
   * call, and a file at the ceiling has more than that - without the loop, resuming
   * a large file would resend everything from the 1,001st part.
   */
  async listParts(key: string, uploadId: string): Promise<Array<UploadedPart>> {
    const parts: Array<UploadedPart> = []
    let marker: string | undefined

    do {
      const response = await this.client.send(
        new ListPartsCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumberMarker: marker,
        }),
      )

      for (const part of response.Parts ?? []) {
        if (!part.PartNumber || !part.ETag) continue

        parts.push({
          partNumber: part.PartNumber,
          size: part.Size ?? 0,
          etag: part.ETag,
        })
      }

      marker = undefined
      if (response.IsTruncated) marker = response.NextPartNumberMarker
    } while (marker !== undefined)

    return parts.sort((a, b) => a.partNumber - b.partNumber)
  }

  /**
   * Closes the upload: the bucket reassembles the parts at the final key.
   *
   * The list must come ordered by `partNumber` and with the `ETag` each part
   * returned - that is how the storage checks that none was lost or arrived
   * half-done.
   */
  async complete(
    key: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ): Promise<void> {
    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts
            .slice()
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((part) => ({ PartNumber: part.partNumber, ETag: part.etag })),
        },
      }),
    )
  }

  /**
   * Discards the upload and the parts already received.
   *
   * Without this, a cancelled upload leaves the parts occupying the bucket
   * forever: they do not appear in the object listing and keep being
   * billed.
   */
  async abort(key: string, uploadId: string): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }),
    )
  }
}
